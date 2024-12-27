let map;
let markers = [];
let selectedCities = [];
let directionsService;
let directionsRenderer;

// Inicializa el mapa
function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: -1.831239, lng: -78.183406 }, // Ecuador
        zoom: 7,
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({ map });

    map.addListener("click", (event) => {
        addMarker(event.latLng);
    });

    document.getElementById("clear-markers").addEventListener("click", clearMarkers);
    document.getElementById("calculate-route").addEventListener("click", calculateRoute);
}

// Añade un marcador al mapa y guarda la ubicación
function addMarker(location) {
    const marker = new google.maps.Marker({
        position: location,
        map: map,
    });

    markers.push(marker);
    selectedCities.push({ lat: location.lat(), lng: location.lng() });
    updateSelectedCities();
}

// Limpia los marcadores y los resultados
function clearMarkers() {
    markers.forEach((marker) => marker.setMap(null));
    markers = [];
    selectedCities = [];
    updateSelectedCities();
    directionsRenderer.setMap(null); // Elimina la ruta mostrada
    directionsRenderer = new google.maps.DirectionsRenderer({ map }); // Reinicia el renderer
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

// Calcula la ruta real utilizando DirectionsService y el orden generado por los algoritmos
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

    drawRealRoute(result.route, elapsedTime);
}

// Dibuja la ruta real y calcula distancias/tiempos con DirectionsService
function drawRealRoute(route, elapsedTime) {
    const orderedWaypoints = route.slice(1, -1).map((city) => ({
        location: city,
        stopover: true,
    }));

    directionsService.route(
        {
            origin: route[0], // Primera ciudad
            destination: route[0], // Vuelve a la primera ciudad
            waypoints: orderedWaypoints, // Ciudades intermedias en el orden del algoritmo
            travelMode: google.maps.TravelMode.DRIVING,
            optimizeWaypoints: false, // Respeta el orden dado
        },
        (response, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
                directionsRenderer.setDirections(response);

                // Cálculo de distancia y tiempo total
                const totalDistance = response.routes[0].legs.reduce((sum, leg) => sum + leg.distance.value, 0) / 1000;
                const totalDuration = response.routes[0].legs.reduce((sum, leg) => sum + leg.duration.value, 0);

                displayResults(route, totalDistance, totalDuration, elapsedTime);
            } else {
                alert("No se pudo calcular la ruta: " + status);
            }
        }
    );
}

// Muestra los resultados en pantalla
function displayResults(route, totalDistance, totalDuration, elapsedTime) {
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = `
        <h3>Resultados:</h3>
        <p>Ruta: ${route
            .map((city, index) => `Ciudad ${index + 1}`)
            .join(" → ")} → Ciudad 1</p>
        <p>Distancia Total (Carreteras): ${totalDistance.toFixed(2)} km</p>
        <p>Tiempo de Recorrido: ${(totalDuration / 60).toFixed(2)} minutos</p>
        <p>Tiempo de Ejecución del Algoritmo: ${elapsedTime.toFixed(3)} segundos</p>
    `;
}

// Calcula la distancia geodésica entre dos coordenadas (para algoritmos)
function calculateDistance(coord1, coord2) {
    const R = 6371; // Radio de la Tierra en kilómetros
    const lat1 = (coord1.lat * Math.PI) / 180;
    const lat2 = (coord2.lat * Math.PI) / 180;
    const deltaLat = lat2 - lat1;
    const deltaLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

    const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en kilómetros
}

// Algoritmos de cálculo

function bruteForce(cities) {
    const permutations = getPermutations(cities);
    let bestRoute = null;
    let bestDistance = Infinity;

    for (const route of permutations) {
        let totalDistance = calculateRouteDistance(route);

        if (totalDistance < bestDistance) {
            bestDistance = totalDistance;
            bestRoute = route;
        }
    }

    return { route: [...bestRoute, bestRoute[0]], distance: bestDistance }; // Cerrar el circuito
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
    const route = [...cities];
    let improved = true;

    while (improved) {
        improved = false;
        for (let i = 1; i < route.length - 1; i++) {
            for (let j = i + 1; j < route.length; j++) {
                const newRoute = [...route];
                [newRoute[i], newRoute[j]] = [newRoute[j], newRoute[i]]; // Intercambia dos ciudades
                const newDistance = calculateRouteDistance(newRoute);
                const currentDistance = calculateRouteDistance(route);

                if (newDistance < currentDistance) {
                    route.splice(0, route.length, ...newRoute); // Reemplaza la ruta
                    improved = true;
                }
            }
        }
    }

    return { route: [...route, route[0]], distance: calculateRouteDistance(route) };
}

function geneticAlgorithm(cities) {
    const populationSize = 50;
    const generations = 200;
    let population = Array.from({ length: populationSize }, () => shuffle([...cities]));
    let bestRoute = null;
    let bestDistance = Infinity;

    for (let gen = 0; gen < generations; gen++) {
        population = population
            .map((route) => ({
                route,
                distance: calculateRouteDistance(route),
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, populationSize / 2); // Selección

        // Crossover
        const newPopulation = [];
        while (newPopulation.length < populationSize) {
            const [parent1, parent2] = randomPair(population.map((p) => p.route));
            newPopulation.push(...crossover(parent1, parent2));
        }

        population = newPopulation.map((route) => mutate(route)); // Mutación
    }

    bestRoute = population[0];
    bestDistance = calculateRouteDistance(bestRoute);

    return { route: [...bestRoute, bestRoute[0]], distance: bestDistance };
}

function simulatedAnnealing(cities) {
    let route = [...cities];
    let bestRoute = [...route];
    let bestDistance = calculateRouteDistance(route);
    let temperature = 10000;
    const coolingRate = 0.995;

    while (temperature > 1) {
        const [i, j] = randomIndices(route.length);
        const newRoute = [...route];
        [newRoute[i], newRoute[j]] = [newRoute[j], newRoute[i]];

        const currentDistance = calculateRouteDistance(route);
        const newDistance = calculateRouteDistance(newRoute);

        if (
            newDistance < currentDistance ||
            Math.random() < Math.exp((currentDistance - newDistance) / temperature)
        ) {
            route = [...newRoute];
        }

        if (newDistance < bestDistance) {
            bestRoute = [...newRoute];
            bestDistance = newDistance;
        }

        temperature *= coolingRate;
    }

    return { route: [...bestRoute, bestRoute[0]], distance: bestDistance };
}

function calculateRouteDistance(route) {
    let totalDistance = 0;
    for (let i = 0; i < route.length - 1; i++) {
        totalDistance += calculateDistance(route[i], route[i + 1]);
    }
    return totalDistance;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function randomPair(array) {
    const [a, b] = randomIndices(array.length);
    return [array[a], array[b]];
}

function randomIndices(length) {
    const i = Math.floor(Math.random() * length);
    let j;
    do {
        j = Math.floor(Math.random() * length);
    } while (i === j);
    return [i, j];
}

function crossover(parent1, parent2) {
    const start = Math.floor(Math.random() * parent1.length);
    const end = Math.floor(Math.random() * parent1.length);
    const [min, max] = [Math.min(start, end), Math.max(start, end)];

    const child1 = Array(parent1.length).fill(null);
    const child2 = Array(parent1.length).fill(null);

    for (let i = min; i <= max; i++) {
        child1[i] = parent1[i];
        child2[i] = parent2[i];
    }

    let p1Index = 0,
        p2Index = 0;

    for (let i = 0; i < parent1.length; i++) {
        if (!child1.includes(parent2[i])) child1[p1Index++] = parent2[i];
        if (!child2.includes(parent1[i])) child2[p2Index++] = parent1[i];
    }

    return [child1, child2];
}

function mutate(route) {
    if (Math.random() < 0.1) {
        const [i, j] = randomIndices(route.length);
        [route[i], route[j]] = [route[j], route[i]];
    }
    return route;
}
