"use strict";
// var rx = require('rxjs');;
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// var Rcon = require('rcon');
const client_1 = require("@prisma/client");
const ts_rcon_1 = __importDefault(require("ts-rcon"));
const rxjs_1 = require("rxjs");
const steamid_1 = __importDefault(require("steamid"));
const dotenv = __importStar(require("dotenv")); // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();
const prisma = new client_1.PrismaClient();
const users = new Map();
var options = {
    tcp: true,
    challenge: false // true to use the challenge protocol (default true)
};
let conn = new ts_rcon_1.default('177.54.148.27', 27294, 'p8srtigxyne4wfa', options);
conn.on('auth', function () {
    // You must wait until this event is fired before sending any commands,
    // otherwise those commands will fail.
    console.log("Authenticated");
    console.log("Sending command: help");
    conn.send("status");
}).on('response', function (str) {
    // console.log("Response: " + str);
    console.log(str);
    let listOfUser = useRegex(str);
    let listOnline = [];
    //conectado
    if (listOfUser) {
        for (const user of listOfUser) {
            let name = user.split(' ')[0];
            let steamId = user.split(' ')[1];
            if (users.get(steamId.toString()) == undefined) {
                users.set(steamId.toString(), name);
                var ss = new steamid_1.default(steamId);
                prisma.playersAntiCheating.findFirst({
                    where: {
                        SteamId: ss.getSteamID64()
                    }
                }).then((userDb) => __awaiter(this, void 0, void 0, function* () {
                    if (userDb) {
                        userDb.IsConnected = true;
                        yield prisma.playersAntiCheating.update({
                            data: userDb,
                            where: {
                                SteamId: userDb.SteamId
                            }
                        });
                    }
                }));
            }
            listOnline.push(steamId);
        }
    }
    //não conectado
    for (const user of users) {
        let userOnline = listOnline.find(x => x == user[0]);
        var ss = new steamid_1.default(user[0]);
        if (userOnline == undefined) {
            prisma.playersAntiCheating.findFirst({
                where: {
                    SteamId: ss.getSteamID64()
                }
            }).then((userDb) => __awaiter(this, void 0, void 0, function* () {
                if (userDb) {
                    userDb.IsConnected = false;
                    yield prisma.playersAntiCheating.update({
                        data: userDb,
                        where: {
                            SteamId: userDb.SteamId
                        }
                    });
                }
            }));
        }
    }
    prisma.playersAntiCheating.findMany({
        where: {
            IsConnected: true
        }
    }).then((userOnlineDb) => __awaiter(this, void 0, void 0, function* () {
        for (const userDb of userOnlineDb) {
            let dateTimeNow = new Date(0);
            dateTimeNow.setMilliseconds(Date.now());
            if (dateTimeNow.getSeconds() > userDb.Expiration.getSeconds()) {
                conn.send(`kick ${userDb.SteamId}`);
                // conn.send(`say Jogador ${userDb.Name} kickado, sem o anticheat aberto.`)
            }
        }
    }));
    console.log(listOfUser);
}).on('error', function (err) {
    conn.connect();
    console.log("Error: " + err);
}).on('end', function () {
    console.log("Connection closed");
    process.exit();
});
conn.connect();
(0, rxjs_1.interval)(5000).subscribe((x) => {
    conn.send("status");
});
function useRegex(input) {
    let reg = /("[A-Za-z]+") (STEAM_[A-Za-z0-9]+:[A-Za-z0-9]:[A-Za-z0-9]+)/g;
    return input.match(reg);
}
//# sourceMappingURL=index.js.map