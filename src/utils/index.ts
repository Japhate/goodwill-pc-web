


export function createPageUrl(pageName: string) {
    if (pageName.toLowerCase() === 'home') return '/';
    return '/' + pageName.toLowerCase().replace(/ /g, '-');
}
