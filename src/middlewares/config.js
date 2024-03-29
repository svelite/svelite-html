
function normalizeConfig(config) {
    if (!config.config) {
        config.config = {}
    }
    if (typeof config.config.tailwindcss === 'undefined') {
        config.config.tailwindcss = true
    }
    if (!config.config.views) {
        config.config.views = './views'
    }
    if (!config.config.styles) {
        config.config.styles = './styles'
    }
    if (!config.config.scripts) {
        config.config.scripts = './scripts'
    }
    if (!config.config.static) {
        config.config.static = './public'
    }

    if (!config.middlewares) {
        config.middlewares = []
    }

    if (!config.ctx) {
        config.ctx = {}
    }
    return config
}


export function configMiddleware(configPath) {
    return async (req, res, next) => {
        const config = await import(configPath)
        req.config = normalizeConfig(config.default)

        next()
    }
}

