export const executeCode = async (req, res) => {
  try {
    const { language, code, stdin } = req.body;

    if (!language || !code) {
      return res.status(400).json({ error: "Lenguaje y código son obligatorios." });
    }

    const languageMap = {
      python: { lang: "python3", version: "3" },
      cpp: { lang: "cpp17", version: "0" },
      java: { lang: "java", version: "3" },
      javascript: { lang: "nodejs", version: "3" }
    };

    const target = languageMap[language] || languageMap["python"];

    const response = await fetch("https://api.jdoodle.com/v1/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        clientId: process.env.JDOODLE_CLIENT_ID,
        clientSecret: process.env.JDOODLE_CLIENT_SECRET,
        script: code,
        stdin: stdin || "",
        language: target.lang,
        versionIndex: target.version
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return res.status(response.status || 400).json({ error: data.error || "Error en el servidor de ejecución." });
    }

    return res.status(200).json({
      output: data.output || "",
      stderr: data.memory === null ? data.output : "",
      code: data.statusCode === 200 ? 0 : 1
    });

  } catch (error) {
    return res.status(500).json({ error: "Error interno al intentar ejecutar el código." });
  }
};