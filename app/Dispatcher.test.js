const {Dispatcher, deg2rad, getDistanceFromLatLonInKm} = require('./Dispatcher.js');

describe('Dispatcher', () => {
    let dispatcher, shipments, drivers, map, shipment, driver;

    beforeEach(() => {
        dispatcher = new Dispatcher();
        shipments = {
            "65289023243": {
                "coordinates": {
                    "latitude": 34.009,
                    "longitude": -118.289
                }
            },
            "3823958290": {
                "coordinates": {
                "latitude": 34.0375,
                "longitude": -118.249
                }
            }
        }
        drivers = {
            "1": {
                "coordinates": {
                    "latitude": 34.048,
                    "longitude": -118.302
                }
            },
            "2": {
                "coordinates": {
                "latitude": 34.027,
                "longitude": -118.26
                }
            }
        }

        map = {
            "3823958290": [
                {
                    "distance": 1.546171496972841,
                    "id": "2",
                },
                {
                    "distance": 5.020966322440316,
                    "id": "1",
                },
            ],
            "65289023243": [
                {
                    "distance": 3.339139503991653,
                    "id": "2",
                },
                {
                    "distance": 4.499035621338663,
                    "id": "1",
                },
            ]
        }
        driver = Object.values(drivers)[0];
        shipment = Object.values(shipments)[0];
    })

    test('getDistanceFromLatLonInKm returns proper distance in km', () => {
        expect(getDistanceFromLatLonInKm(
            driver.coordinates.latitude,
            driver.coordinates.longitude,
            shipment.coordinates.latitude,
            shipment.coordinates.longitude
        )).toBe(5.020966322440316);
    })

    test('deg2rad returns proper radius from a lat/long coordinate', () => {
        expect(deg2rad(driver.coordinates.latitude)).toBe(0.5942497037190294);
    })

    test('getDriversByDistance returns a list of the closest drivers from closest -> furthest from a shipment ', () => {
        
        const expected = [
            {
                "distance": 1.546171496972841,
                "id": "2",
            },
            {
                "distance": 5.020966322440316,
                "id": "1",
            }
        ];
        const result = dispatcher.getDriversByDistance(shipment, drivers);
        expect(result).toEqual(expected);
    })

    test('generateMap creates a map of all drivers in relation to each shipment', async () => {
        const expected = map;
        const result = await dispatcher.generateMap(shipments, drivers);
        expect(result).toEqual(expected);
    })

    test('getClosestDrivers shifts off and returns a specified number of closest drivers to a shipment in the map', () => {
        const shipmentId = Object.keys(shipments)[0];
        const expected = JSON.parse(JSON.stringify(map[shipmentId]));
        const result = dispatcher.getClosestDrivers(map[shipmentId], 2);
        expect(result).toEqual(expected);
        expect(map[shipmentId].length).toBe(0);
    })

})
