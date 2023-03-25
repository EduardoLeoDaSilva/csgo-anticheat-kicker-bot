// var rx = require('rxjs');;

// var Rcon = require('rcon');

import { PrismaClient, PlayersAntiCheating } from '@prisma/client';
import Rcon from 'ts-rcon';
import { interval } from 'rxjs'
import  SteamId  from 'steamid'
import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();
const prisma = new PrismaClient()
const users = new Map<string, string>();
var options = {
  tcp: true,       // false for UDP, true for TCP (default true)
  challenge: false  // true to use the challenge protocol (default true)
};
let conn = new Rcon('177.54.148.27', 27294, 'p8srtigxyne4wfa', options);


conn.on('auth', function () {
  // You must wait until this event is fired before sending any commands,
  // otherwise those commands will fail.
  console.log("Authenticated");
  console.log("Sending command: help")
  conn.send("status");
}).on('response', function (str) {
  // console.log("Response: " + str);

  console.log(str)
  let listOfUser = useRegex(str)
  let listSteamIdOnline: string[] = [];
  let listUsersWIthSteamIdOnline: any[] = [];

  //conectado
  if (listOfUser) {
    for (const user of listOfUser) {
      let name = user.split(' ')[0];
      let steamId = user.split(' ')[1];
      if (users.get(steamId.toString()) == undefined) {

        users.set(steamId.toString(), name)

        var ss = new SteamId(steamId);
        prisma.playersAntiCheating.findFirst({
          where: {
            SteamId: ss.getSteamID64()
          }
        }).then(async (userDb) => {
          if (userDb) {
            userDb.IsConnected = true;
            userDb.Name = name;
            await prisma.playersAntiCheating.update({
              data: userDb,
              where: {
                SteamId: userDb.SteamId
              }
            });
          }
        });
      }
      listSteamIdOnline.push(steamId);
      listUsersWIthSteamIdOnline.push({name, steamId});
    }

  }

  //não conectado
  for (const user of users) {
    let userOnline = listSteamIdOnline.find(x => x == user[0])
    var ss = new SteamId(user[0]);
    
    if (userOnline == undefined) {
      prisma.playersAntiCheating.findFirst({
        where: {
          SteamId: ss.getSteamID64()
        }
      }).then(async (userDb) => {
        if (userDb) {
          userDb.IsConnected = false;
          await prisma.playersAntiCheating.update({
            data: userDb,
            where: {
              SteamId: userDb.SteamId
            }
          });
        }
      });


    }
  }

  prisma.playersAntiCheating.findMany({
    where: {
      IsConnected: true
    }
  }).then(async (userOnlineDb) => {
    for (const userDb of userOnlineDb) {
      let dateTimeNow = new Date(0);
      dateTimeNow.setMilliseconds(Date.now());

      let user = listUsersWIthSteamIdOnline.find(x => x.steamId == userDb.SteamId);

      if ((dateTimeNow.getSeconds() > userDb.Expiration.getSeconds()) || userDb.IsAntiCheatOpen == false) {
        conn.send(`kick ${user.name}`)
        conn.send(`say Jogador ${user.Name} kickado, sem o anticheat aberto.`)
      }
    }
  })
  console.log(listOfUser)


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


function useRegex(input) {
  let reg = /(".+") (STEAM_[A-Za-z0-9]+:[A-Za-z0-9]:[A-Za-z0-9]+)/g;
  return input.match(reg);
}
