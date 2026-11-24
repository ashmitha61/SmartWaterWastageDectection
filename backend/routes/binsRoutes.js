const express = require('express');
const router = express.Router();
const {
  getAllBins,
  getBinById,
  createBin,
  updateBin,
  deleteBin
} = require('../controllers/binsController');

router.route('/')
  .get(getAllBins)
  .post(createBin);

router.route('/:id')
  .get(getBinById)
  .put(updateBin)
  .delete(deleteBin);

module.exports = router;
