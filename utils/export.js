function sendExportResponse(res, format, data, filename) {
    if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
        res.send(data);
    } else if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.json`);
        res.json(data);
    } else {
        res.status(400).json({ error: 'Unsupported export format' });
    }
}

module.exports = { sendExportResponse };
