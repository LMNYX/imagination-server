import { APIRoute } from "http/routing";
import hash from "utilities/hash";
import fs from "fs";

export default class DeleteUploadAPIRoute extends APIRoute
{
    constructor()
    {
        super("GET");
    }

    async call(request, reply)
    {
        let _auth = await this._public.Authenticate(this.db, request.query.key);
        if (!_auth)
        {
            reply.status(401);
            return reply.send({
                "error": "Unauthorized"
            });
        
        }

        if (_auth.isBanned)
        {
            reply.status(403);
            return reply.send({
                "error": "You are banned."
            });
        }

        if (!request.query.filename)
            return {
                "success": false,
                "error": "No filename was provided."
            };
        
        let doesExist = await this.db.checkDocumentExists("uploads", {
            "filename": request.query.filename
        });

        if (!doesExist)
            return {
                "success": false,
                "error": "File does not exist."
            };
        
        let upload = await this.db.getDocument("uploads", {
            "filename": request.query.filename
        });

        if (upload.uploader !== hash(_auth.displayName))
            return {
                "success": false,
                "error": "You do not own this file."
            };
        
        let collection = await this.db.getCollection("uploads");
        await collection.deleteOne({
            "filename": request.query.filename
        });

        fs.unlinkSync(`${__dirname}/../../../../privateuploads/${upload.actual_filename}`);

        return {
            "success": true
        };
        
    }
}