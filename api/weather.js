export default async function handler(req, res) {
    try {
        const { city } = req.query;

        if (!city) {
            return res.status(400).json({
                error: "City is required"
            });
        }

        const apiKey = process.env.API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "API_KEY is not configured on Vercel"
            });
        }

        const url =
            `https://api.openweathermap.org/data/2.5/weather` +
            `?q=${encodeURIComponent(city)}` +
            `&units=metric` +
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
            error: "Weather API request failed"
        });
    }
}
