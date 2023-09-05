export default function calculateRating(uploads, views, daysSinceUpload)
{
    try
    {
        let rating = parseFloat((views / uploads)-((views / uploads)*2*(daysSinceUpload/120))) ?? 0;
        return rating;
    } catch
    {
        return 0;
    }
}