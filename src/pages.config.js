/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   const HomePage = lazy(() => import('./pages/HomePage'));
 *   const Dashboard = lazy(() => import('./pages/Dashboard'));
 *   const Settings = lazy(() => import('./pages/Settings'));
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   const Home = lazy(() => import('./pages/Home'));
 *   const Settings = lazy(() => import('./pages/Settings'));
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import { lazy } from 'react';
import __Layout from './Layout.jsx';

const About = lazy(() => import('./pages/About'));
const Admin = lazy(() => import('./pages/Admin'));
const Connect = lazy(() => import('./pages/Connect'));
const Give = lazy(() => import('./pages/Give'));
const Prayer = lazy(() => import('./pages/Prayer'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Resources = lazy(() => import('./pages/Resources'));
const Updates = lazy(() => import('./pages/Updates'));
const Home = lazy(() => import('./pages/Home'));

export const PAGES = {
    "About": About,
    "Admin": Admin,
    "Connect": Connect,
    "Give": Give,
    "Prayer": Prayer,
    "Privacy": Privacy,
    "Resources": Resources,
    "Updates": Updates,
    "Home": Home,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
