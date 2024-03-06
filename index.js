const fs = require("fs");
const express = require("express");
const fileUpload = require("express-fileupload")

/**
 * Enum for accepted profiles
 * @readonly
 * @enum {string}
 */
const Profiles = {
  A: "a",
  B: "b"
};

// const activeProfiles = [Profiles.A];
const activeProfiles = [Profiles.B];
// const activeProfiles = [Profiles.A, Profiles.B];

/**
 * @typedef {CallableFunction} Action
 * @function
 * @param {Object} req
 * @param {Object} res
 */

function defaultAction(req, res, next) {
  if (req.files) {
    console.log(`File received: mime-type: ${req.files.export.mimetype}, tempFilePath: ${req.files.export.tempFilePath}`);
  } else {
    console.log(JSON.stringify(req.body));
  }
  console.log();
  res.send("");
  next();
}

function writeBody(req, res, next) {
  let timestamp = (new Date()).getTime(); 
  let output_path = `${timestamp}.json`;
  console.log(`Saving body to ${output_path}`);
  fs.writeFileSync(output_path, JSON.stringify(req.body));
  console.log();
  res.send("");
  next();
}

/**
 * HTTP methods enum
 * @readonly
 * @enum {string}
 */
const httpMethods = {
  POST: "post",
  PUT: "put",
  GET: "get",
  DELETE: "delete",
}

/**
 * @typedef {Object} Endpoint
 * @property {string} method - HTTP method
 * @property {string} route - Route
 * @property {Action} action - Action 
 */

/**
 * @typedef {Object} Service
 * @property {Profiles} profiles - profiles this service belongs to
 * @property {number} port - Port for the service
 * @property {string} base_path - Base path prepended to every endpoint
 * @property {Endpoint[]} endpoints 
 */

/**
 * @type {Service[]}
 */
const services = [
  {
    // A
    profiles: [Profiles.A],
    port: 8100,
    base_path: "/api/v1/",
    endpoints: [
      {
        method: httpMethods.POST,
        route: "do/something",
        action: defaultAction,
      },
    ],
    static: [],
  },
  {
    // B
    profiles: [Profiles.B],
    port: 8101,
    base_path: "/api/v1/",
    endpoints: [
      // Inference progress
      {
        method: httpMethods.POST,
        route: "do/something",
        action: defaultAction,
      },
      {
        method: httpMethods.POST,
        route: "do/something/:iid",
        action: defaultAction,
      },
      {
        method: httpMethods.PUT,
        route: "update/something",
        action: defaultAction,
      },
      {
        method: httpMethods.PUT,
        route: "update/something/:iid",
        action: defaultAction,
      },
      {
        method: httpMethods.POST,
        route: "write/something",
        action: writeBody,
      },
    ],
    static: [],
  },
  {
    profiles: [Profiles.B],
    port: 8102,
    base_path: "/api/v1/",
    endpoints: [],
    static: [
      {
        route: "files",
        path: "static/files",
      },
      {
        route: "images",
        path: "static/images",
      }
    ],
  },
  {
    profiles: [],
    port: 3000,
    base_path: "/",
    endpoints: [
      {
        method: httpMethods.POST,
        route: "",
        action: defaultAction,
      }
    ],
    static: [],
  }
];


for (let service of services) {
  if (!service.profiles.every(val => activeProfiles.includes(val))) {
    continue;
  }
  let app = express();
  app.use(express.json({limit: "5gb"}));
  app.use(fileUpload({useTempFiles: true, tempFileDir: "/tmp/echo-server"}));

  for (let endpoint of service.endpoints) {
    let route = service.base_path + endpoint.route;
    app[endpoint.method](route, (req, res, next) => { 
      console.log(`Received request on ${route} with method ${endpoint.method} :`);
      endpoint.action(req, res, next)
    });
  }

  for (let stat of service.static) {
    app.use(stat.route, express.static(stat.path));
  }

  app.listen(service.port, "0.0.0.0", () => {
    console.log(`Loaded echo server for port ${service.port} with routes:`);
    for (let endpoint of service.endpoints) {
      let route = service.base_path + endpoint.route;
      console.log(`${endpoint.method} -- ${route}`);
    }
    for (let endpoint of service.static) {
      console.log(`Static -- ${endpoint.route}`)
    }
  })
}
