const axios = require('axios');
const Promise = require('promise');
const colors = require('colors');

const DATA_PATH = '../data';
const DISPATCH_FREQUENCY = process.env.DISPATCH_FREQUENCY || 2000;
const NUM_DRIVERS =  process.env.NUM_DRIVERS || 3;


// converts a distance coordinate to a radius
// reference https://stackoverflow.com/questions/21279559/geolocation-closest-locationlat-long-from-my-position/21297385
const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
}

// gets distance from two points on a map in km
// reference: https://stackoverflow.com/questions/21279559/geolocation-closest-locationlat-long-from-my-position/21297385
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}


class Dispatcher {
    constructor() {
        this.drivers = require(`${DATA_PATH}/drivers.json`);
        this.shipments = require(`${DATA_PATH}/shipments.json`);
        this.map = this.generateMap(this.shipments, this.drivers) // {shipmentId: [closest driverIds from closest => farthest]}
        this.acceptedShipments = {}; // shipmentId: driverId
        this.ROUND = 1;
    }

    // generates a list of the closest drivers from closest -> furthest from a shipment
    getDriversByDistance(shipment, drivers) {
        return Object.keys(drivers)
            .map(driverId => {
                const driver = {};
                const driverInfo = drivers[driverId];
                driver.id = driverId;
                driver.distance = getDistanceFromLatLonInKm(
                    driverInfo.coordinates.latitude,
                    driverInfo.coordinates.longitude,
                    shipment.coordinates.latitude,
                    shipment.coordinates.longitude
                );
                return driver;
            })
            .sort((a, b) => {
                const distanceA = a.distance;
                const distanceB = b.distance;
                let comparison = 0;
                if (distanceA > distanceB) {
                    comparison = 1;
                } else if (distanceA < distanceB) {
                    comparison = -1;
                }
                return comparison;
            });
    }

    // creates a map of all drivers in relation to each shipment
    generateMap(shipments, drivers) {
        return Object.keys(shipments).reduce((acc, shipmentId) => {
            const shipment = shipments[shipmentId];
            const driversByDistance = this.getDriversByDistance(shipment, drivers);
            acc[shipmentId] = driversByDistance;
            return acc;
        }, {});
    }

    // sends a shipment dispatch request to a driver
    sendDispatch(shipmentId, driverId) {
        return axios.post(
            `http://challenge.shipwithbolt.com/driver/${driverId}/dispatch`, {
                shipmentId: `${shipmentId}`
            }
        );
    }

    // sends out shipment dispatch requests to a certain number of drivers
    dispatchShipmentToClosestDriver(shipmentId, closestDrivers) {
        return Promise.all(closestDrivers.map(async driver => {
            try {
                if (!driver) {
                    return new Promise(resolve => {
                        resolve(-1);
                    })
                }
                const response = await this.sendDispatch(shipmentId, driver.id);
                console.log('DISPATCH SENT:'.blue, `${JSON.stringify(response.data)}`);
                if (response.data.response.toLowerCase() === 'accepted') {
                    this.acceptedShipments[shipmentId] = driver.id;
                }
                return response;
            } catch (err) {
                if (err && err.response) {
                    console.error(err.response);
                }
                return err;
            }
        }));
    }

    // shifts off and returns a specified number of closest drivers to a shipment in the map
    getClosestDrivers(drivers, numDrivers) {
        const closestDrivers = [];
        for (let i = 0; i < numDrivers; i++) {
            // mutates state since no driver should be able to get the same shipment dispatch request twice
            const driver = drivers.shift();
            closestDrivers.push(driver);
        }
        return closestDrivers
    }

    getAvailableShipmentIds(shipments, acceptedShipments, map) {
        return Object.keys(shipments)
            .filter(shipmentId => {
                return !Object.keys(acceptedShipments).includes(shipmentId) && map[shipmentId].length
            });
    }

    run(scheduleInterval) {
        console.log(`\nROUND ${this.ROUND++}\n`.bold.underline);
        const availableShipmentIds = this.getAvailableShipmentIds(this.shipments, this.acceptedShipments, this.map);
        Promise.all(
            availableShipmentIds.map(async shipmentId => {
                const drivers = this.map[shipmentId];
                const numdriversLeft = drivers.length;
                const closestDrivers = this.getClosestDrivers(drivers, NUM_DRIVERS);
                console.log('DISPATCHING SHIPMENT:'.yellow, shipmentId, `(${numdriversLeft} available drivers nearby)`.dim);
                return await this.dispatchShipmentToClosestDriver(shipmentId, closestDrivers);
            })
        )
            .then(resp => {
                const numAcceptedShipments = Object.keys(this.acceptedShipments).length;
                const totalNumShipments = Object.keys(this.shipments).length;
                console.log(
                    `\n${numAcceptedShipments}/${totalNumShipments} SHIPMENTS ACCEPTED: \n`.green.bold,
                    `${JSON.stringify(this.acceptedShipments)}\n`
                );

                const allShipmentsHaveBeenDispatched = Object.keys(this.acceptedShipments).length === Object.keys(this.shipments).length;
                if (allShipmentsHaveBeenDispatched) {
                    clearInterval(scheduleInterval);
                    console.log('\nSUCCESS: ALL SHIPMENTS ACCEPTED\n'.green.bold);
                    return;
                }
                const availableShipmentIds = this.getAvailableShipmentIds(this.shipments, this.acceptedShipments, this.map);
                if (availableShipmentIds.length === 0) {
                    clearInterval(scheduleInterval);
                    console.log(
                        '\nFAILURE: NO MORE AVAILABLE DRIVERS -- NOT ALL SHIPMENTS HAVE BEEN ACCEPTED\n'.red.bold
                    );
                }
            })
            .catch(err => {
                clearInterval(scheduleInterval);
                console.error('SOMETHING WENT WRONG:\n'.red, err);
            })
    }

    async init() {
        // dispatch first shipments
        this.run();
        // schedule subsequent dispatch requests
        const scheduleInterval = setInterval(() => {
            this.run(scheduleInterval);
        }, DISPATCH_FREQUENCY);
    }
}

module.exports = {
    Dispatcher,
    deg2rad,
    getDistanceFromLatLonInKm
};
