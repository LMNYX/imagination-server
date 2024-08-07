import { APIRoute } from "http/routing";
import { Field, buildMessage } from "utilities/logexternal";

const restrictedFields = [
    "key",
    "protected",
    "displayName"
];

/*--includedoc

@private false
@needsauth true
@adminonly true
@params [(string) key, (string) target, (string) field, (string) value]
@returns New value
@returnexample { "success": true, "value": "" }
Modifies a specific field from a user's profile, excluding protected fields.

*/
export default class AdminModifySessionsAPIRoute extends APIRoute
{
    constructor()
    {
        super("POST");
    }

    async call(request, reply, server)
    {
        const requestData = request.body;
        
        let doesExist = await server.db.checkDocumentExists("users", {
            "key": requestData.key
        });

        if (!doesExist)
            return {
                "success": false,
                "error": "Invalid key."
            };
        
        let user = await server.db.getDocument("users", {
            "key": requestData.key
        });

        if (!user.administrator)
            return {
                "success": false,
                "error": "You are not an administrator."
            };
        
        if (!requestData.target || !requestData.field || 'value' in requestData == false)
            return {
                "success": false,
                "error": "Missing parameters."
            };
        
        if (restrictedFields.includes(requestData.field))
            return {
                "success": false,
                "error": "You cannot modify this field."
            };

        let target = await server.db.getDocument("users", {
            "displayName": requestData.target
        });

        if (!target)
            return {
                "success": false,
                "error": "Invalid target."
            };
        
        if (target.protected)
            return {
                "success": false,
                "error": "You cannot modify this user."
            };

        if (target.administrator && requestData.field == "isBanned")
            return {
                "success": false,
                "error": "You cannot ban an administrator."
            };

        server.db.updateDocument("users", {
            "displayName": requestData.target
        }, {
            "$set": {
                [requestData.field]: requestData.value
            }
        });

        if (requestData.field == "isBanned")
        {
            server.db.updateDocument("users", {
                "displayName": requestData.target
            }, {
                "$set": {
                    "banFieldModificationBy": user.displayName
                }
            });
        }

        // External logging
        server.externalLogging.Log(buildMessage(
            request.headers['host'],
            "info",
            "A user's session has been modified.",
            `A user's session has been modified by \`${user.displayName}\`:\n\`${requestData.target}\`'s \`${requestData.field}\` has been set to \`${requestData.value}\``,
            null,
            new Field("Target", requestData.target, true),
            new Field("Modified By", user.displayName, true),
            new Field("Field", requestData.field, true),
            new Field("Value", requestData.value, true)
        ));

        return {
            "success": true,
            "value": requestData.value
        };
    }
}
