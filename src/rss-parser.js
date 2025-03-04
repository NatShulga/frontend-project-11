const parseXML = (data) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(data.contents, 'application/xml');

  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('errors.urlIsNotRSS');
  }

  const items = [...doc.querySelectorAll('item')].map((item) => ({
    title: item.querySelector('title')?.textContent,
    link: item.querySelector('link')?.textContent,
    description: item.querySelector('description')?.textContent,
  }));
    
  return {
    title: doc.querySelector('title')?.textContent,
    link: doc.querySelector('link')?.textContent,
    description: doc.querySelector('description')?.textContent,
    items,
  };
};

export default parseXML;
