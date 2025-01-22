let map;
let graphMap;
let markers = [];
let selectedCities = [];
let directionsService;
let directionsRenderer;
let graphLines = []; // Líneas y etiquetas del grafo
let distanceMatrix = {}; // Almacena las distancias reales entre ciudades
let showingGraphMap = false; // Controla qué mapa se muestra

// Inicializa los mapas
function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: -1.831239, lng: -78.183406 }, // Ecuador
        zoom: 7,
    });

    graphMap = new google.maps.Map(document.getElementById("graph-map"), {
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
    document.getElementById("toggle-map").addEventListener("click", toggleMap);
}

// Alterna entre los mapas (ruta y grafo)
function toggleMap() {
    showingGraphMap = !showingGraphMap;
    document.getElementById("map").style.display = showingGraphMap ? "none" : "block";
    document.getElementById("graph-map").style.display = showingGraphMap ? "block" : "none";
}

// Añade un marcador y actualiza la matriz de distancias
function addMarker(location) {
    if (selectedCities.length >= 10) {
        alert("Máximo 10 ciudades permitidas.");
        return;
    }

    const marker = new google.maps.Marker({
        position: location,
        map: map,
    });

    markers.push(marker);
    selectedCities.push({ lat: location.lat(), lng: location.lng() });
    updateSelectedCities();
    updateDistanceMatrix();
}

// Limpia los marcadores y el grafo
function clearMarkers() {
    markers.forEach((marker) => marker.setMap(null));
    markers = [];
    selectedCities = [];
    distanceMatrix = {};
    clearGraphLines();
    updateSelectedCities();
    directionsRenderer.setMap(null); // Elimina la ruta mostrada
    directionsRenderer = new google.maps.DirectionsRenderer({ map }); // Reinicia el renderer
    document.getElementById("results").innerHTML = ""; // Limpia los resultados
}

// Limpia las líneas del grafo
function clearGraphLines() {
    graphLines.forEach((line) => line.setMap(null));
    graphLines = [];
}

// Actualiza la lista de ciudades seleccionadas
function updateSelectedCities() {
    const cityList = document.getElementById("selected-cities");
    cityList.innerHTML = "";
    selectedCities.forEach((city, index) => {
        cityList.innerHTML += `<li>Ciudad ${index + 1}: (${city.lat.toFixed(6)}, ${city.lng.toFixed(6)})</li>`;
    });
}

// Actualiza la matriz de distancias reales entre ciudades
function updateDistanceMatrix() {
    const requests = [];
    distanceMatrix = {};

    for (let i = 0; i < selectedCities.length; i++) {
        for (let j = i + 1; j < selectedCities.length; j++) {
            const origin = selectedCities[i];
            const destination = selectedCities[j];

            requests.push(
                new Promise((resolve) => {
                    directionsService.route(
                        {
                            origin: origin,
                            destination: destination,
                            travelMode: google.maps.TravelMode.DRIVING,
                        },
                        (response, status) => {
                            if (status === google.maps.DirectionsStatus.OK) {
                                const distance = response.routes[0].legs[0].distance.value / 1000; // En km
                                if (!distanceMatrix[i]) distanceMatrix[i] = {};
                                if (!distanceMatrix[j]) distanceMatrix[j] = {};
                                distanceMatrix[i][j] = distance;
                                distanceMatrix[j][i] = distance;
                                resolve();
                            } else {
                                console.error("Error al obtener la distancia: " + status);
                                resolve();
                            }
                        }
                    );
                })
            );
        }
    }

    Promise.all(requests).then(() => console.log("Matriz de distancias actualizada"));
}

// Dibuja la ruta seleccionada en el grafo con distancias
function drawSelectedGraph(route) {
    clearGraphLines();

    // Excluye la última ciudad para evitar líneas duplicadas en el grafo
    for (let i = 0; i < route.length - 1; i++) {
        const city1 = route[i];
        const city2 = route[i + 1];
        const cityIndex1 = selectedCities.indexOf(city1);
        const cityIndex2 = selectedCities.indexOf(city2);

        const distance = distanceMatrix[cityIndex1][cityIndex2];

        const line = new google.maps.Polyline({
            path: [city1, city2],
            geodesic: true,
            strokeColor: "#FF0000",
            strokeOpacity: 1.0,
            strokeWeight: 2,
            map: graphMap,
        });

        const midPoint = {
            lat: (city1.lat + city2.lat) / 2,
            lng: (city1.lng + city2.lng) / 2,
        };

        const label = new google.maps.Marker({
            position: midPoint,
            label: `${distance.toFixed(2)} km`,
            map: graphMap,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 0,
            },
        });

        graphLines.push(line, label);
    }
}

// Calcula la ruta seleccionada con un algoritmo
function calculateRoute() {
    const algorithm = document.getElementById("algorithm-selector").value;

    if (selectedCities.length < 2) {
        alert("Selecciona al menos dos ciudades para calcular una ruta.");
        return;
    }

    let result;
    switch (algorithm) {
        case "brute-force":
            result = bruteForce();
            break;
        case "local-search":
            result = localSearch();
            break;
        case "genetic":
            result = geneticAlgorithm();
            break;
        case "simulated-annealing":
            result = simulatedAnnealing();
            break;
        default:
            alert("Selecciona un algoritmo válido.");
            return;
    }

    drawRealRoute(result.route);
    drawSelectedGraph(result.route);
}

// Dibuja la ruta real en el mapa
function drawRealRoute(route) {
    const orderedWaypoints = route.slice(1, -1).map((city) => ({
        location: city,
        stopover: true,
    }));

    directionsService.route(
        {
            origin: route[0],
            destination: route[0],
            waypoints: orderedWaypoints,
            travelMode: google.maps.TravelMode.DRIVING,
            optimizeWaypoints: false,
        },
        (response, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
                directionsRenderer.setDirections(response);

                const totalDistance = response.routes[0].legs.reduce((sum, leg) => sum + leg.distance.value, 0) / 1000;
                const totalDuration = response.routes[0].legs.reduce((sum, leg) => sum + leg.duration.value, 0);

                displayResults(route, totalDistance, totalDuration);
            } else {
                alert("No se pudo calcular la ruta: " + status);
            }
        }
    );
}

// Muestra los resultados de la ruta
function displayResults(route, totalDistance, totalDuration) {
    const resultsDiv = document.getElementById("results");
    const routeDisplay = route
        .slice(0, -1) // Excluye la última ciudad repetida
        .map((city, index) => `Ciudad ${index + 1}`)
        .join(" → ") + " → Ciudad 1"; // Añade la ciudad inicial al final solo para mostrar

    resultsDiv.innerHTML = `
        <h3>Resultados:</h3>
        <p>Ruta: ${routeDisplay}</p>
        <p>Distancia Total (Carreteras): ${totalDistance.toFixed(2)} km</p>
        <p>Tiempo de Recorrido: ${(totalDuration / 60).toFixed(2)} minutos</p>
    `;
}

// Algoritmos (implementados según la teoría de grafos)

function bruteForce() {
    const permutations = getPermutations(selectedCities);
    let bestRoute = null;
    let bestDistance = Infinity;

    for (const route of permutations) {
        const totalDistance = calculateRouteDistance(route);

        if (totalDistance < bestDistance) {
            bestDistance = totalDistance;
            bestRoute = route;
        }
    }

    return { route: [...bestRoute, bestRoute[0]], distance: bestDistance };
}

function localSearch() {
    let route = [...selectedCities];
    let bestDistance = calculateRouteDistance(route);
    let improved = true;

    while (improved) {
        improved = false;
        for (let i = 1; i < route.length - 1; i++) {
            for (let j = i + 1; j < route.length; j++) {
                const newRoute = [...route];
                [newRoute[i], newRoute[j]] = [newRoute[j], newRoute[i]];
                const newDistance = calculateRouteDistance(newRoute);

                if (newDistance < bestDistance) {
                    bestDistance = newDistance;
                    route = newRoute;
                    improved = true;
                }
            }
        }
    }

    return { route: [...route, route[0]], distance: bestDistance };
}

function geneticAlgorithm() {
    const populationSize = 100;
    const generations = 200;
    let population = Array.from({ length: populationSize }, () => shuffle([...selectedCities]));
    let bestRoute = null;
    let bestDistance = Infinity;

    for (let gen = 0; gen < generations; gen++) {
        population = population
            .map((route) => ({
                route,
                distance: calculateRouteDistance(route),
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, populationSize / 2);

        const newPopulation = [];
        while (newPopulation.length < populationSize) {
            const [parent1, parent2] = randomPair(population.map((p) => p.route));
            newPopulation.push(...crossover(parent1, parent2));
        }

        population = newPopulation.map((route) => mutate(route));

        const bestInGen = population[0];
        const bestInGenDistance = calculateRouteDistance(bestInGen);
        if (bestInGenDistance < bestDistance) {
            bestDistance = bestInGenDistance;
            bestRoute = bestInGen;
        }
    }

    return { route: [...bestRoute, bestRoute[0]], distance: bestDistance };
}

function simulatedAnnealing() {
    let route = [...selectedCities];
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

// Calcula la distancia total de una ruta utilizando la matriz de distancias
function calculateRouteDistance(route) {
    let totalDistance = 0;
    for (let i = 0; i < route.length - 1; i++) {
        const cityIndex1 = selectedCities.indexOf(route[i]);
        const cityIndex2 = selectedCities.indexOf(route[i + 1]);
        totalDistance += distanceMatrix[cityIndex1][cityIndex2];
    }
    return totalDistance;
}

// Funciones auxiliares
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
