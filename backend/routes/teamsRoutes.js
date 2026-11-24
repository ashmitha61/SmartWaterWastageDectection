const express = require('express');
const router = express.Router();
const {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamMembers,
  addTeamMember,
  deleteTeamMember
} = require('../controllers/teamsController');

// Teams CRUD
router.route('/')
  .get(getAllTeams)
  .post(createTeam);

router.route('/:id')
  .get(getTeamById)
  .put(updateTeam)
  .delete(deleteTeam);

// Team Members Sub-routes
router.route('/:teamId/members')
  .get(getTeamMembers)
  .post(addTeamMember);

router.delete('/members/:memberId', deleteTeamMember);

module.exports = router;
