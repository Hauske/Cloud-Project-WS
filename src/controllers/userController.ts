import { Request, Response } from "express";
import prisma from "../prisma/client";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

function validEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

class AuthController {
    async createUser(req: Request, res: Response){
        try {
            const {
                name,
                password,
                email,
            } = req.body;

            if(!validEmail(email)){
                return res.status(400).json({ error: "Invalid email format." });
            }

            const existingUser = await prisma.user.findUnique({ where: { email } })

            if(existingUser) {
                return res.status(409).json({ error: "Email already registered." });
            }

            const saltRounds = Number(process.env.SALT);

            if (isNaN(saltRounds)) {
                throw new Error("SALT environment variable must be a valid number");
            }

            const hashedPassword = await bcrypt.hash(password, saltRounds);

            const user = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword
                }
            });

            const jwtSecret = process.env.JWT_SECRET;

            const token = jwt.sign(
                { userId: user.id, email: user.email },
                jwtSecret!,
                { expiresIn: '1h' }
            );

            return res.status(201).json({
                message: "User created successfully",
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            });
        }
        catch(e) {
            console.log('error:', e);
            return res.status(500).json({ error: 'There was an error creating the client' });
        }
    };

    async loginUser(req: Request, res: Response){
        try {
            const {email, password} = req.body;

            if(!validEmail(email)) {
                return res.status(400).json({ error: "Invalid email format." });
            }

            const user = await prisma.user.findUnique({ where: { email } });

            if(!user) {
                return res.status(404).json({ error: "User not found." });
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                return res.status(401).json({ error: "Invalid password." });
            }

            const jwtSecret = process.env.JWT_SECRET;

            const token = jwt.sign(
                { userId: user.id, email: user.email },
                jwtSecret!,
                { expiresIn: '1h' }
            );

            return res.status(201).json({
                message: "Login sucessfull",
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                }
            });
        }
        catch(e) {
            console.error('error:', e);
        return res.status(500).json({ error: 'There was an error logging in the user' });
        }
    }
}

export default new AuthController();