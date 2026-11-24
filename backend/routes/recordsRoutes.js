const express = require('express');
const router = express.Router();
const {
  getAllRecords,
  getRecordById,
  createRecord,
  deleteRecord,
  getRecordsByBin
} = require('../controllers/recordsController');

router.route('/')
  .get(getAllRecords)
  .post(createRecord);

router.get('/bin/:binId', getRecordsByBin);

router.route('/:id')
  .get(getRecordById)
  .delete(deleteRecord);

module.exports = router;
