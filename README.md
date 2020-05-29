# Mothership Challenge

## Instructions

##### Running the App
*Make sure that you have Node, version >= `8.11.3`, installed on your environment*
- *Step 1:* Install dependencies by running `yarn`
- *Step 2:* Then run the app with `yarn start`
    - you'll see the outcome of the app running each round of shipment dispatches in your terminal.
- *Step 3:* Then run tests with `yarn test`

##### Notes
- I've added console logs for you to follow along on the progress of the app

- Also, you can optionally use the env variables `DISPATCH_FREQUENCY (num in milliseconds)` and `NUM_DRIVERS (num)` if you want to speed up the app.
    - For example `DISPATCH_FREQUENCY=3000 NUM_DRIVERS=5 yarn start` will increase the frequency that dispatch requests are sent out from a default of 10 seconds to 3 seconds and the number of closest drivers to dispatch from a default of 3 to 5.
