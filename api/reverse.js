export default async function handler(req, res) {
    try {
        const { lat, lon } = req.query;

        if (!lat || !lon) {
            return res.status(400).json({
                error: "Latitude and longitude are required"
            });
        }

        const apiKey = process.env.API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "API_KEY is not configured on Vercel"
            });
        }

        const url =
            `https://api.openweathermap.org/geo/1.0/reverse` +
            `?lat=${encodeURIComponent(lat)}` +
            `&lon=${encodeURIComponent(lon)}` +
            `&limit=1` +
            `&appid=${apiKey}`;

        const response = await fetch(url);

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Reverse geocoding failed"
        });
    }
}
