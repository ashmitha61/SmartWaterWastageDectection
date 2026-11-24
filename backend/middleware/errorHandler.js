// Centralized Error Handling Middleware for DBMS REST API

const errorHandler = (err, req, res, next) => {
  console.error('[API Error]:', err);

  // MySQL Duplicate Entry (e.g. unique bin code, unique category name, unique team name)
  if (err.code === 'ER_DUP_ENTRY') {
    let duplicateField = 'Record';
    if (err.message.includes('bin_code')) duplicateField = 'Bin Code';
    else if (err.message.includes('category_name')) duplicateField = 'Category Name';
    else if (err.message.includes('team_name')) duplicateField = 'Team Name';
    else if (err.message.includes('unique_schedule_bin')) duplicateField = 'Bin already assigned to this schedule';

    return res.status(409).json({
      success: false,
      error: 'Duplicate Entry Error',
      message: `${duplicateField} already exists. Please choose a different unique identifier.`,
      code: err.code
    });
  }

  // MySQL Foreign Key Constraint Failure on DELETE (Referenced child row exists)
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(400).json({
      success: false,
      error: 'Referential Integrity Error',
      message: 'Cannot delete or modify this record because it is currently linked to other active records (foreign key constraint). Please remove the associated records first.',
      code: err.code
    });
  }

  // MySQL Foreign Key Constraint Failure on INSERT/UPDATE (Parent row missing)
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      error: 'Invalid Reference Error',
      message: 'The referenced ID does not exist in the parent table. Please check your foreign key selection.',
      code: err.code
    });
  }

  // MySQL Check Constraint Violated
  if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    return res.status(400).json({
      success: false,
      error: 'Check Constraint Violation',
      message: 'Supplied data violates database integrity rules (e.g. fill level must be 0-100% or quantity must be positive).',
      code: err.code
    });
  }

  // Default response
  const statusCode = err.status || err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected server error occurred while processing the request.'
  });
};

module.exports = errorHandler;
