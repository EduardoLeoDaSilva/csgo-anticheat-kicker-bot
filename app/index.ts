// var rx = require('rxjs');;

// var Rcon = require('rcon');

import { PrismaClient, PlayersAntiCheating } from '@prisma/client';
import Rcon from 'rcon';
import {interval} from 'rxjs'
var options = {
  tcp: true,       // false for UDP, true for TCP (default true)
  challenge: false  // true to use the challenge protocol (default true)
};
let conn = Rcon('177.54.148.27', '27294', 'p8srtigxyne4wfa', options);


conn.on('auth', function () {
  // You must wait until this event is fired before sending any commands,
  // otherwise those commands will fail.
  console.log("Authenticated");
  console.log("Sending command: help")
  conn.send("status");
}).on('response', function (str) {
  // console.log("Response: " + str);

 let listOfUser = useRegex(str)

 

}).on('error', function (err) {
  conn.connect();
  console.log("Error: " + err);
}).on('end', function () {
  console.log("Connection closed");
  process.exit();
});

conn.connect();


interval(5000).subscribe((x) => {
  conn.send("status");
})



function steamIDto64(steamID) {
  const STEAM_ID_BASE = BigInt("76561197960265728");
  const [_, x, y, z] = steamID.split(":").map((n) => BigInt(n));
  const steam64 = STEAM_ID_BASE + BigInt(y * 2 + z);
  if (x === BigInt(1)) {
    return steam64 + BigInt(1);
  }
  return steam64;
}

function useRegex(input) {
  let reg = /("[A-Za-z]+") (STEAM_[A-Za-z0-9]+:[A-Za-z0-9]:[A-Za-z0-9]+)/g;
  return input.match(reg);
}
