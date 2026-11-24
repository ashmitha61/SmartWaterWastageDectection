const express = require('express');
const router = express.Router();
const {
  getAllSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getAvailableBinsForLocation
} = require('../controllers/schedulesController');

router.route('/')
  .get(getAllSchedules)
  .post(createSchedule);

router.get('/available-bins/:locationId', getAvailableBinsForLocation);

router.route('/:id')
  .get(getScheduleById)
  .put(updateSchedule)
  .delete(deleteSchedule);

module.exports = router;
