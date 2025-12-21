import { getRequestConfig } from 'next-intl/server';
import { locales } from './config';

export default getRequestConfig(async ({ locale }) => {
    // Validate that the incoming `locale` parameter is valid
    const baseLocale = (locale && (locales as readonly string[]).includes(locale))
        ? locale
        : 'es';

    return {
        locale: baseLocale,
        messages: (await import(`./messages/${baseLocale}.json`)).default
    };
});
