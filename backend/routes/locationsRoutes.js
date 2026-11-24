const express = require('express');
const router = express.Router();
const {
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation
} = require('../controllers/locationsController');

router.route('/')
  .get(getAllLocations)
  .post(createLocation);

router.route('/:id')
  .get(getLocationById)
  .put(updateLocation)
  .delete(deleteLocation);

module.exports = router;
