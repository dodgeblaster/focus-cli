export default {
    github: 'https://github.com/shuding/nextra', // GitHub link in the navbar
    docsRepositoryBase: 'https://github.com/shuding/nextra/blob/master', // base URL for the docs repository
    titleSuffix: ' – Docs',
    nextLinks: true,
    prevLinks: true,
    search: true,
    customSearch: null, // customizable, you can use algolia for example
    darkMode: true,
    footer: true,
    footerText: `Rise Focus ${new Date().getFullYear()}`,
    footerEditLink: `Edit this page on GitHub`,
    logo: (
        <>
            <div
                style={{
                    background: '#405C7B',
                    color: 'white',
                    fontWeight: 'bold',
                    padding: '4px 10px',
                    fontSize: 14
                }}
            >
                RISE
            </div>
            <div
                style={{
                    background: '#082442',
                    color: 'white',
                    fontWeight: 'bold',
                    padding: '4px 10px',
                    fontSize: 14
                }}
            >
                FOCUS
            </div>
        </>
    ),
    head: (
        <>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta name="description" content="Nextra: the next docs builder" />
            <meta name="og:title" content="Nextra: the next docs builder" />
        </>
    )
}
