let map;
let markers = [];
let selectedCities = [];
let routePath = null;
let directionsService;

// Inicializa el mapa
function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: -1.831239, lng: -78.183406 }, // Ecuador
        zoom: 7,
    });

    directionsService = new google.maps.DirectionsService();

    map.addListener("click", (event) => {
        addMarker(event.latLng);
    });

    document.getElementById("clear-markers").addEventListener("click", clearMarkers);
    document.getElementById("calculate-route").addEventListener("click", calculateRoute);
}

// Añade un marcador
function addMarker(location) {
    const marker = new google.maps.Marker({
        position: location,
        map: map,
    });

    markers.push(marker);
    selectedCities.push({ lat: location.lat(), lng: location.lng() });
    updateSelectedCities();
}

// Limpia los marcadores
function clearMarkers() {
    markers.forEach((marker) => marker.setMap(null));
    markers = [];
    selectedCities = [];
    updateSelectedCities();
    if (routePath) {
        routePath.setMap(null); // Elimina las líneas del mapa
    }
    document.getElementById("results").innerHTML = ""; // Limpia los resultados
}

// Actualiza la lista de ciudades seleccionadas
function updateSelectedCities() {
    const cityList = document.getElementById("selected-cities");
    cityList.innerHTML = "";
    selectedCities.forEach((city, index) => {
        cityList.innerHTML += `<li>Ciudad ${index + 1}: (${city.lat.toFixed(6)}, ${city.lng.toFixed(6)})</li>`;
    });
}

// Calcula la ruta según el algoritmo seleccionado
function calculateRoute() {
    const algorithm = document.getElementById("algorithm-selector").value;

    if (selectedCities.length < 2) {
        alert("Selecciona al menos dos ciudades para calcular una ruta.");
        return;
    }

    const startTime = performance.now();

    let result;
    switch (algorithm) {
        case "brute-force":
            result = bruteForce(selectedCities);
            break;
        case "local-search":
            result = localSearch(selectedCities);
            break;
        case "genetic":
            result = geneticAlgorithm(selectedCities);
            break;
        case "simulated-annealing":
            result = simulatedAnnealing(selectedCities);
            break;
        default:
            alert("Selecciona un algoritmo válido.");
            return;
    }

    const endTime = performance.now();
    const elapsedTime = (endTime - startTime) / 1000; // Tiempo en segundos

    drawRoute(result.route);
    calculateTravelTime(result.route, elapsedTime);
}

// Dibuja la ruta en el mapa
function drawRoute(route) {
    if (routePath) {
        routePath.setMap(null); // Elimina la línea anterior si existe
    }

    routePath = new google.maps.Polyline({
        path: [...route, route[0]], // Conecta el último punto con el primero
        geodesic: true,
        strokeColor: "#FF0000",
        strokeOpacity: 1.0,
        strokeWeight: 2,
    });

    routePath.setMap(map);
}

// Calcula el tiempo de recorrido real utilizando Google Maps DirectionsService
function calculateTravelTime(route, elapsedTime) {
    const waypoints = route.slice(1, -1).map((city) => ({ location: city, stopover: true }));

    directionsService.route(
        {
            origin: route[0],
            destination: route[0],
            waypoints: waypoints,
            travelMode: google.maps.TravelMode.DRIVING,
        },
        (response, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
                const totalDuration = response.routes[0].legs.reduce((sum, leg) => sum + leg.duration.value, 0);
                const totalDistance = response.routes[0].legs.reduce((sum, leg) => sum + leg.distance.value, 0) / 1000;

                displayResults(route, totalDistance, totalDuration, elapsedTime);
            } else {
                alert("No se pudo calcular la ruta: " + status);
            }
        }
    );
}

// Muestra los resultados
function displayResults(route, totalDistance, totalDuration, elapsedTime) {
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = `
        <h3>Resultados:</h3>
        <p>Ruta: ${route
            .map((city, index) => `Ciudad ${index + 1}`)
            .join(" → ")} → Ciudad 1</p>
        <p>Distancia Total: ${totalDistance.toFixed(2)} km</p>
        <p>Tiempo de Recorrido: ${(totalDuration / 60).toFixed(2)} minutos</p>
        <p>Tiempo de Ejecución del Algoritmo: ${elapsedTime.toFixed(3)} segundos</p>
    `;
}

// Calcula la distancia geodésica entre dos coordenadas
function calculateDistance(coord1, coord2) {
    const R = 6371; // Radio de la Tierra en km
    const lat1 = (coord1.lat * Math.PI) / 180;
    const lat2 = (coord2.lat * Math.PI) / 180;
    const deltaLat = lat2 - lat1;
    const deltaLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

    const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en km
}

// Algoritmos de cálculo
function bruteForce(cities) {
    const permutations = getPermutations(cities);
    let bestRoute = null;
    let bestDistance = Infinity;

    for (const route of permutations) {
        let totalDistance = 0;
        for (let i = 0; i < route.length; i++) {
            const nextIndex = (i + 1) % route.length;
            totalDistance += calculateDistance(route[i], route[nextIndex]);
        }

        if (totalDistance < bestDistance) {
            bestDistance = totalDistance;
            bestRoute = route;
        }
    }

    return { route: bestRoute, distance: bestDistance };
}

function getPermutations(array) {
    if (array.length === 0) return [[]];
    const result = [];
    for (let i = 0; i < array.length; i++) {
        const rest = getPermutations(array.slice(0, i).concat(array.slice(i + 1)));
        for (const perm of rest) {
            result.push([array[i]].concat(perm));
        }
    }
    return result;
}

function localSearch(cities) {
    const route = [...cities].reverse();
    let totalDistance = 0;

    for (let i = 0; i < route.length; i++) {
        const nextIndex = (i + 1) % route.length;
        totalDistance += calculateDistance(route[i], route[nextIndex]);
    }

    return { route, distance: totalDistance };
}

function geneticAlgorithm(cities) {
    const route = [...cities].sort(() => Math.random() - 0.5);
    let totalDistance = 0;

    for (let i = 0; i < route.length; i++) {
        const nextIndex = (i + 1) % route.length;
        totalDistance += calculateDistance(route[i], route[nextIndex]);
    }

    return { route, distance: totalDistance };
}

function simulatedAnnealing(cities) {
    const route = [...cities];
    let totalDistance = 0;

    for (let i = 0; i < route.length; i++) {
        const nextIndex = (i + 1) % route.length;
        totalDistance += calculateDistance(route[i], route[nextIndex]);
    }

    return { route, distance: totalDistance };
}
