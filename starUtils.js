/**
 * Place planets on celestial sphere.
 *   Just to confuse things a bit more this takes ra in degrees
 *
 * @param {degrees} ra
 * @param {degrees} dec
 * @param {degrees} lon
 * @param {degrees} lat
 * @param {Date} date
 * @param {Number} distanceto place celestial sphere
 * */
export function raDec2XYZ(
  ra,
  dec,
  lon = -106,
  lat = 35,
  date = new Date(),
  distance = 110000,
  offsetAlt = 0,
  offsetAz = 0
) {
  var your_location = {
    latitude: lat + offsetAlt,
    longitude: lon + offsetAz,
    altitude: 0,
  };

  const star = {
    ra: (24 * ra) / 360,
    dec: dec,
    distance: distance,
  };
  const observe_star = new Orb.Observation({
    observer: your_location,
    target: star,
  });
  const horizontal = observe_star.azel(date);
  // console.log(horizontal)
  const azimuth = horizontal.azimuth * (Math.PI / 180);
  const elev = horizontal.elevation * (Math.PI / 180);
  const celR = horizontal.distance;
  const y = Math.sin(elev) * celR;
  const x = Math.sin(azimuth) * Math.cos(elev) * celR;
  const z = -Math.cos(azimuth) * Math.cos(elev) * celR;

  return [x, y, z];
}

export async function addStars(
  scene,
  starObjects,
  stars,
  lon = -106,
  lat = 35,
  date = new Date(),
  offsetAlt = 0,
  offsetAz = 0
) {
  var your_location = {
    latitude: lat,
    longitude: lon,
    altitude: 0,
  };
  const threeObjects = [];
  for (let i = 0; i < stars.declination.length; i++) {
    const ra = stars.rightAscension[i] * (180 / Math.PI);
    const dec = stars.declination[i] * (180 / Math.PI);
    const mag = (8 - stars.apparentMagnitude[i]) ** 2 * 40;

    let [x, y, z] = raDec2XYZ(
      ra,
      dec,
      lon,
      lat,
      date,
      undefined,
      offsetAlt,
      offsetAz
    );
    let colorIndex = Math.floor(
      ((stars.colorIndexBV[i] + 0.27) / 3.9) * stars.color.length
    );
    colorIndex = Math.min(stars.color.length - 1, colorIndex);
    const colour = stars.color[colorIndex];
    let cube = undefined;
    if (starObjects && starObjects[i]) {
      cube = starObjects[i];
    } else {
      const geometry = new THREE.BoxGeometry(mag, mag, mag);
      const color = `rgb(${Math.floor(255 * colour[0])},${Math.floor(
        255 * colour[1]
      )},${Math.floor(255 * colour[2])})`;
      const material = new THREE.MeshBasicMaterial({ color: color });
      cube = new THREE.Mesh(geometry, material);
    }
    scene.add(cube);
    cube.position.x = x;
    cube.position.y = y;
    cube.position.z = z;
    threeObjects.push(cube);
  }
  return threeObjects;
}

export async function addPlanets(
  scene,
  planetObjects,
  lon = -106,
  lat = 35,
  date = new Date()
) {
  // console.log('planets',date)
  let planetThreeObjectsResult = [];
  const planets = [
    { name: "Sun", color: 0xffff44 },
    { name: "Mercury", color: 0xffff00 },
    { name: "Venus", color: 0x00ff55 },
    // ,{name:"Earth", color:0xff0000}
    { name: "Moon", color: 0x999999 },
    { name: "Mars", color: 0xff0000 },
    { name: "Jupiter", color: 0xff00ff },
    { name: "Saturn", color: 0x0044aa },
    { name: "Uranus", color: 0x5500ff },
    { name: "Neptune", color: 0x00ffff },
  ];
  // const planets = ["Sun", "Moon","Mercury","Venus","Earth"]
  for (let i = 0; i < planets.length; i++) {
    let planZ = planets[i];
    let celestialSphereRadius = 100000;
    let dist = undefined;
    let color = planZ.color;
    let name = planZ.name;
    let planetRadius = 500;
    try {
      let planet = new Orb.VSOP(name);
      if (name == "Sun") {
        planet = new Orb.Sun();
        dist = 1;
        planetRadius = 6000;
      }
      if (name == "Moon") {
        planet = new Orb.Moon();
        dist = 0.0002;
        planetRadius = 1;
      }
      const radec = planet.radec(date); // ecliptic rectangular coordinates(x, y, z)
      const ra = (radec.ra * 360) / 24;
      const dec = radec.dec;
      dist = dist || radec.distance;
      let [x, y, z] = raDec2XYZ(ra, dec, lon, lat, date, dist);
      let sphere = undefined;
      if (planetObjects && planetObjects[i]) {
        sphere = planetObjects[i];
      } else {
        const geometry = new THREE.SphereGeometry(planetRadius, 32, 32);
        const material = new THREE.MeshBasicMaterial({ color });
        sphere = new THREE.Mesh(geometry, material);
      }

      sphere.position.x = x * celestialSphereRadius;
      sphere.position.y = y * celestialSphereRadius;
      sphere.position.z = z * celestialSphereRadius;
      scene.add(sphere);
      planetThreeObjectsResult.push(sphere);
      // console.log({planet,p:sphere.position, dist, ra, dec})
    } catch (err) {
      console.error(planZ);
      console.error(err);
    }
  }
  return planetThreeObjectsResult;
}

export async function loadStars() {
  const resp = await fetch("./starData.json");
  const json = await resp.json();
  //console.log(json)
  return json;
}

export function makeRings(scene) {
  var material = new THREE.LineBasicMaterial({ color: 0xff0000 });
  for (var dec = -90; dec <= 85; dec += 15) {
    let points = [];
    let [x1, y1, z1] = raDec2XYZ(0, dec);
    points.push(new THREE.Vector3(x1, y1, z1));
    for (var ra = 1; ra <= 360; ra += 1) {
      let [x2, y2, z2] = raDec2XYZ(ra, dec);
      points.push(new THREE.Vector3(x2, y2, z2));
    }
    var geometry = new THREE.BufferGeometry().setFromPoints(points);
    var line = new THREE.Line(geometry, material);
    scene.add(line);
  }
  var material = new THREE.LineBasicMaterial({ color: 0xff0000 });
  for (var ra = 0; ra < 360; ra += 15) {
    let points = [];
    let [x1, y1, z1] = raDec2XYZ(ra, -75);
    points.push(new THREE.Vector3(x1, y1, z1));
    for (var dec = -90; dec <= 90; dec += 1) {
      if (ra % 90 == 0 || Math.abs(dec) <= 75) {
        let [x2, y2, z2] = raDec2XYZ(ra, dec);
        points.push(new THREE.Vector3(x2, y2, z2));
      }
    }
    var geometry = new THREE.BufferGeometry().setFromPoints(points);
    var line = new THREE.Line(geometry, material);
    scene.add(line);
  }
}
