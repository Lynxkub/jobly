const { BadRequestError } = require("../expressError");

// THIS NEEDS SOME GREAT DOCUMENTATION.

// **  This function accepts data to update(can include {firstName, lastName      ,   password , email , isAdmin}).
// **  jsToSql is an object that has the column names in the SQL table that need to be updated
// **  Maps the keys of jsToSql to a new array where the keys = their index+1 (comes out $1 , $2 etc in order to represent postgres placeholders for varaibles)
// ** returns an object {setCols : [columnName=$1 , columnName=$2 , etc...] ,       values : dataToUpdateValues}
// ** This is used to update a user or a company to only update partial information




function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };