export const CHURCH_IDENTITY = {
  name: 'Goodwill Presbyterian Church, USA',
  shortName: 'Goodwill Presbyterian Church',
  formalName: 'Goodwill Presbyterian Church, USA - Mayesville, SC',
  foundingYear: '1867',
  slogan: 'A sanctuary of love, hope and peace for all.',
  website: 'https://www.goodwillpresch1867.com/',
  privacyUrl: 'https://www.goodwillpresch1867.com/Privacy',
};

export const CHURCH_CONTACT = {
  phoneDisplay: '(803) 495-3599',
  phoneHref: 'tel:8034953599',
  phoneE164: '+1-803-495-3599',
  email: 'goodwillpresch1867@gmail.com',
  emailHref: 'mailto:goodwillpresch1867@gmail.com',
};

export const CHURCH_ADDRESS = {
  street: '295 North Brick Church Road',
  streetShort: '295 N Brick Church Rd',
  city: 'Mayesville',
  region: 'SC',
  postalCode: '29104',
  country: 'US',
};

export const CHURCH_LOCATION = {
  addressLines: [
    CHURCH_ADDRESS.street,
    `${CHURCH_ADDRESS.city}, ${CHURCH_ADDRESS.region} ${CHURCH_ADDRESS.postalCode}`,
  ],
  displayAddress: `${CHURCH_ADDRESS.street}, ${CHURCH_ADDRESS.city}, ${CHURCH_ADDRESS.region} ${CHURCH_ADDRESS.postalCode}`,
  compactAddress: `${CHURCH_ADDRESS.streetShort}, ${CHURCH_ADDRESS.city}, ${CHURCH_ADDRESS.region} ${CHURCH_ADDRESS.postalCode}`,
  directionsUrl: 'https://www.google.com/maps/search/?api=1&query=295+North+Brick+Church+Road,Mayesville,SC+29104',
  embedUrl: 'https://maps.google.com/maps?q=295%20N%20Brick%20Church%20Rd%2C%20Mayesville%2C%20SC%2029104&t=&z=15&ie=UTF8&iwloc=&output=embed',
};

export const CHURCH_SOCIAL_LINKS = {
  facebook: 'https://www.facebook.com/share/177iq2ZzgN/',
  youtube: 'https://www.youtube.com/@goodwillpresbyterianchurch1867',
};

export const PRIMARY_WORSHIP_SERVICE = {
  day: 'Sunday',
  time: '10:30 AM',
  name: 'Worship Service',
  schemaDay: 'https://schema.org/Sunday',
};

export const WEEKLY_GATHERINGS = [
  PRIMARY_WORSHIP_SERVICE,
  {
    day: 'Wednesday',
    time: '6:30 PM',
    name: 'Bible Study',
    zoomLink: 'https://us02web.zoom.us/j/82827270338?pwd=9JhQLcH0WjX6Xvy7LqvNtZUE3UBr9C.1',
  },
];
