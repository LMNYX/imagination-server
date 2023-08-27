import { APIRoute } from "http/routing";
import { GeneratePrivateID, GeneratePublicID } from "utilities/id";
import hash from "utilities/hash";
import { pipeline } from "stream/promises";
import { promisify } from "util";
import fs from "fs";

export default class UploadsNewAPIRoute extends APIRoute
{
    constructor()
    {
        super("POST");
    }

    async call(request, reply)
    {
        let _auth = await this._public.Authenticate(this.db, request.headers["authorization"]);
        if (!_auth)
        {
            reply.status(401);
            return reply.send({
                "error": "Unauthorized"
            });
        
        }

        const data = await request.file();

        if (!data)
        {
            reply.status(400);
            return reply.send({
                "error": "No file was provided"
            });
        
        }

        let ids = {
            "private": GeneratePrivateID(),
            "public": GeneratePublicID(),
            "delete": GeneratePrivateID()
        };
        
        const pipelineAsync = promisify(pipeline);
        await pipelineAsync(
            data.file,
            fs.createWriteStream(`${__dirname}/../../../../privateuploads/${ids.private}`)
        );

        let stats = fs.statSync(`${__dirname}/../../../../privateuploads/${ids.private}`);
        let fileSizeInBytes = stats.size;

        let collection = await this.db.getCollection("uploads");
        await collection.insertOne({
            "uploader": hash(_auth.displayName),
            "actual_filename": ids.private,
            "original_filename": data.filename,
            "filename": ids.public,
            "file_ext": data.filename.split(".")[1],
            "mimetype": data.mimetype,
            "timestamp": Date.now(),
            "deletehash": null, // DEPRECATED: But still used for backwards compatibility
            "uploaded_thru": request.headers['host'],
            "size": fileSizeInBytes
        });

        reply.send({
            "success": true,
            "data": {
                "link": `https://${request.headers['host']}/${_auth.displayName}/${ids.public}`
            }
        });

    }
}