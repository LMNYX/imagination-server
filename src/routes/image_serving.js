import { Route } from "http/routing";
import hash from "utilities/hash";

export default class ImageServing extends Route
{
    constructor()
    {
        super("/:uploader/:filename", "GET");
    }

    async call(request, reply)
    {
        let doesFileExist = await this.db.checkDocumentExists("uploads", {
            "uploader": hash(request.params.uploader),
            "filename": request.params.filename
        });

        if (!doesFileExist)
        {
            reply.status(404);
            reply.send({
                "success": false,
                "data": {
                    "message": "File not found"
                }
            });
            return;
        }

        let file = await this.db.getDocument("uploads", {
            "uploader": hash(request.params.uploader),
            "filename": request.params.filename
        });

        if (!file.mimetype.test(/image\/.*/) || !file.mimetype.test(/video\/.*/) || !file.mimetype.test(/audio\/.*/) || !file.mimetype.test(/text\/.*/))
            reply.header("Content-Disposition", `attachment; filename="${file.filename}.${file.file_ext ? file.file_ext : ""}"`);

        reply.type(file.mimetype);

        reply.sendFile(file.actual_filename, {
            "root": `${__dirname}/../../privateuploads`
        });
    }
}