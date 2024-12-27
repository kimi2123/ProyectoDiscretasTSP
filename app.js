function initMap() {
    // Map options
    var options = {
        center: { lat: 38.3460, lng: -0.4907 },
        zoom: 10
    };

    // New map
    const map = new google.maps.Map(document.getElementById("map"), options);

    // Store markers and distances
    const markers = [];
    const distances = [];

    // Listen for map clicks to add markers (cities)
    google.maps.event.addListener(map, "click", (event) => {
        const location = event.latLng;
        addMarker(location, markers, map);
        updateDistances(markers, distances);
    });

    // Add a marker to the map
    function addMarker(location, markersArray, mapInstance) {
        const marker = new google.maps.Marker({
            position: location,
            map: mapInstance
        });

        markersArray.push(marker);
        if (markersArray.length > 1) {
            updateDistances(markersArray, distances);
        }
    }

    // Update distance matrix
    function updateDistances(markersArray, distancesArray) {
        distancesArray.length = 0; // Reset distances
        for (let i = 0; i < markersArray.length; i++) {
            const row = [];
            for (let j = 0; j < markersArray.length; j++) {
                if (i === j) {
                    row.push(0);
                } else {
                    const distance = google.maps.geometry.spherical.computeDistanceBetween(
                        markersArray[i].getPosition(),
                        markersArray[j].getPosition()
                    );
                    row.push(distance);
                }
            }
            distancesArray.push(row);
        }
        console.log("Updated Distances:", distancesArray);
    }

    // Solve TSP using selected algorithm
    document.getElementById("solveTSP").addEventListener("click", () => {
        const algorithm = document.getElementById("algorithm").value;
        solveTSP(algorithm, markers, distances, map);
    });

    // Solve TSP
    function solveTSP(algorithm, markersArray, distancesArray, mapInstance) {
        if (markersArray.length < 2) {
            alert("Add at least two cities to solve the TSP.");
            return;
        }

        let result;

        switch (algorithm) {
            case "bruteForce":
                result = bruteForceTSP(distancesArray);
                break;
            case "localSearch":
                result = localSearchTSP(distancesArray);
                break;
            case "genetic":
                result = geneticAlgorithmTSP(distancesArray);
                break;
            case "simulatedAnnealing":
                result = simulatedAnnealingTSP(distancesArray);
                break;
            default:
                alert("Invalid algorithm selected.");
                return;
        }

        displayRoute(result.route, markersArray, mapInstance);
        console.log("Result:", result);
    }

    // Placeholder algorithm implementations
    function bruteForceTSP(distancesArray) {
        // Implement brute-force algorithm
        return { route: [0, 1, 2, 0], distance: 12345, time: "00:12:30" };
    }

    function localSearchTSP(distancesArray) {
        // Implement local search algorithm
        return { route: [0, 2, 1, 0], distance: 6789, time: "00:08:45" };
    }

    function geneticAlgorithmTSP(distancesArray) {
        // Implement genetic algorithm
        return { route: [0, 3, 1, 2, 0], distance: 5432, time: "00:15:00" };
    }

    function simulatedAnnealingTSP(distancesArray) {
        // Implement simulated annealing algorithm
        return { route: [0, 1, 3, 2, 0], distance: 4321, time: "00:10:15" };
    }

    // Display the calculated route on the map
    function displayRoute(route, markersArray, mapInstance) {
        const pathCoordinates = route.map(index => markersArray[index].getPosition());

        const routePath = new google.maps.Polyline({
            path: pathCoordinates,
            geodesic: true,
            strokeColor: "#FF0000",
            strokeOpacity: 1.0,
            strokeWeight: 2
        });

        routePath.setMap(mapInstance);
    }
}
