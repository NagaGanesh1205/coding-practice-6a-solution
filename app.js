const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19India.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertTotalTONormal = (getTotal) => {
  return {
    totalCases: getTotal.total_cases,
    totalCured: getTotal.total_cured,
    totalActive: getTotal.total_active,
    totalDeaths: getTotal.total_deaths,
  };
};

const convertJSONDistrictToNormal = (district) => {
  return {
    districtId: district.district_id,
    districtName: district.district_name,
    stateId: district.state_id,
    cases: district.cases,
    cured: district.cured,
    active: district.active,
    deaths: district.deaths,
  };
};
const convertJSONToNormalObject = (state) => {
  return {
    stateId: state.state_id,
    stateName: state.state_name,
    population: state.population,
  };
};

app.get("/states/", async (request, response) => {
  const getStatesQuery = `
    SELECT * FROM state ORDER BY state_id;
    `;
  const statesArray = await db.all(getStatesQuery);
  response.send(statesArray.map((state) => convertJSONToNormalObject(state)));
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT * FROM state WHERE state_id = ${stateId};
    `;
  const state = await db.get(getStateQuery);
  response.send(convertJSONToNormalObject(state));
});

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const postDistrictQuery = `
  INSERT INTO district(district_name,state_id,cases,cured,active,deaths)
  VALUES (${districtName},${stateId},${cases},${cured},${active},${deaths});
  `;
  await db.run(postDistrictQuery);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT * FROM district
    WHERE district_id = ${districtId};
    `;
  const district = await db.get(getDistrictQuery);
  response.send(convertJSONDistrictToNormal(district));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    DELETE * FROM district WHERE district_id = ${districtId};
    `;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const updateDetails = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = updateDetails;
  console.log(districtName);
  const putDistrictQuery = `
    UPDATE district 
    SET district_name = ${districtName},
    state_id = ${stateId},cases = ${cases},cured = ${cured},active = ${active}'
    deaths = ${deaths}
    WHERE district_id = ${districtId};
    `;
  await db.run(putDistrictQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getTotalCasesQuery = `
    SELECT sum(cases) as total_cases,
    sum(cured) as total_cured,sum(active) as total_active,
    sum(deaths) as total_deaths
    FROM district WHERE state_id = ${stateId};
    `;
  const getTotal = await db.get(getTotalCasesQuery);
  response.send(convertTotalTONormal(getTotal));
});
