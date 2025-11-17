import { Request, Response } from "express";
import prisma from "../prisma/client";

class CvController {
    async createCv(req: Request, res: Response) {
        try {
            const { userId, data }  = req.body;
            const cv = await prisma.cV.create({ data: { userId, data } });
            
            res.status(201).json(cv);
        }
        catch(e) {
            res.status(500).json({ e: 'Failed to create CV' });
        }
    }

    async getCvsByUser(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const cvs = await prisma.cV.findMany({ where: { userId } });
            
            res.status(200).json(cvs);
        }
        catch(e) {
            res.status(500).json({ e: 'Failed to retrieve CVs' });
        }
    }

    async getCvById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const cv = await prisma.cV.findUnique({ where: { id } });
            
            if (!cv) {
                return res.status(404).json({ error: 'CV not found' });
            };

            //TODO get from bucket

            res.status(200).json(cv);
        }
        catch(e) {
            res.status(500).json({ e: 'Failed to retrieve CV' });
        }

    }

    async updateCV(req: Request, res: Response) {
        try {
            const { cvId } = req.params;
            const { data } = req.body;

            const cv = await prisma.cV.findUnique({ where: { id: cvId } });

            if(!cv) {
                return res.status(404).json({ error: 'CV doesnt exist' });
            }
            
            const updatedCV = await prisma.cV.update({
                where: { id: cvId },
                data: { data },
            });
            
            res.status(200).json(updatedCV);
        }
        catch(e) {
            res.status(500).json({ e: 'Failed to update CV' });
        }
    }

    async deleteCV(req: Request, res: Response) {
         try {
            const { cvId } = req.params;
            const cv = await prisma.cV.findUnique({ where: { id: cvId } });

            if(!cv) {
                return res.status(404).json({ error: 'CV doesnt exist' });
            }

            await prisma.cV.delete({ where: { id: cvId } });

            //TODO delete from bucket
            
            res.status(204).send();
        } 
        catch (e) {
            res.status(500).json({ error: 'Failed to delete CV' });
        }
    }

}

export default new CvController();