// var rx = require('rxjs');;

// var Rcon = require('rcon');

import { PrismaClient, PlayersAntiCheating } from '@prisma/client';
import Rcon from 'ts-rcon';
import { interval } from 'rxjs'
import SteamId from 'steamid'
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
}).on('response', function (str:string) {

  if(str.includes('sem o anticheat aberto')){
    return;
  }
  console.log(str)
  let usersOnlineRegex = useRegex(str)
  let listSteamIdOnline: string[] = [];
  let listUsersWIthSteamIdOnline: any[] = [];

  //conectado
  if (usersOnlineRegex) {
    for (const user of usersOnlineRegex) {
      let name: string = user.match(/"(?:[^\\"]|\\\\|\\")*"/i)?.[0] ?? "";
      let steamId = user.match(/STEAM_[A-Za-z0-9]+:[A-Za-z0-9]+:[A-Za-z0-9]+/igm)?.[0] ?? ""
      let map = str.match(/map\s+:\s+[A-Za-z0-9/\]de_[A-Za-z0-9]+/igm)?.[0] ?? ""
      if (users.get(steamId.toString()) == undefined) {
        users.set(steamId.toString(), name)
      }
      var ss = new SteamId(steamId);
      prisma.playersAntiCheating.findFirst({
        where: {
          SteamId: ss.getSteamID64()
        }
      }).then(async (userDb) => {
        if (userDb) {
          userDb.IsConnected = true;
          userDb.Name = name.replace('"', '').replace('"', ''),
            userDb.Map = map.split(':')[1].replace(' ', ''),
            await prisma.playersAntiCheating.update({
              data: userDb,
              where: {
                SteamId: userDb.SteamId
              }
            });
        } else {
          let player : PlayersAntiCheating = {
            Name: name.replace('"', '').replace('"', ''),
            Map: map.split(':')[1].replace(' ', ''),
            Expiration: new Date(Date.now()),
            IsAntiCheatOpen: true,
            IsConnected: true,
            LastPhotoTaken: new Date(Date.now()),
            SteamId: ss.getSteamID64().toString()
          }
          await prisma.playersAntiCheating.create ({
            data: player
          });
        }
      });

      listSteamIdOnline.push(steamId);
      listUsersWIthSteamIdOnline.push({ name, steamId });
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
          users.delete(ss.getSteamID64());
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

      // let user = listUsersWIthSteamIdOnline.find(x => new SteamId(x.steamId).getSteamID64() == userDb.SteamId);
      let tt = dateTimeNow;

      var expirationMiliSeconds = Date.UTC(userDb.Expiration.getUTCFullYear(), userDb.Expiration.getUTCMonth(),
        userDb.Expiration.getUTCDate(), userDb.Expiration.getUTCHours(),
        userDb.Expiration.getUTCMinutes(), userDb.Expiration.getUTCSeconds());

      let expirationDate = addHours(new Date(expirationMiliSeconds), 3);

      if ((dateTimeNow > expirationDate) || userDb.IsAntiCheatOpen == false) {
        userDb.IsAntiCheatOpen = false;
        userDb.IsConnected = false;
        await prisma.playersAntiCheating.update({
          data: userDb,
          where: {
            SteamId: userDb.SteamId
          }
        });
        // conn.send(`kick ${userDb.Name}`)
        conn.send(`say Jogador ${userDb.Name} kickado, sem o anticheat aberto.`)
      }
    }
  })
}).on('error', function (err) {
  conn.connect();
  console.log("Error: " + err);
}).on('end', function () {
  console.log("Connection closed");
  process.exit();
});

conn.connect();


interval(20000).subscribe((x) => {
  conn.send("status");
  console.log("De novo");
})


function useRegex(input): string[] {
  let reg = /(".+") (STEAM_[A-Za-z0-9]+:[A-Za-z0-9]:[A-Za-z0-9]+)/g;
  return input.match(reg);
}


function addHours(date, hours) {
  date.setHours(date.getHours() + hours);

  return date;
}