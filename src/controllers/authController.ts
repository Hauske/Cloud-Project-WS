import { Request, Response } from "express";
import prisma from "../prisma/client";

class AuthController {
    async createUser(req: Request, res: Response){
        try {
            const {
                name,
                password,
                email,
            } = req.body;

            const user = await prisma.user.create({
                data: {
                    name,
                    password,
                    email
                }
            });

            return res.json(user);
        }
        catch(e){

        }
    };
}

export default new AuthController();