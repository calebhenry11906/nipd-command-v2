import React from 'react';import{createRoot}from'react-dom/client';import{BrowserRouter,HashRouter}from'react-router-dom';import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import App from './app/App';import './styles.css';
const Router=import.meta.env.BASE_URL!=='/'?HashRouter:BrowserRouter;
const client=new QueryClient({defaultOptions:{queries:{retry:1,refetchOnWindowFocus:false,staleTime:30000}}});createRoot(document.getElementById('root')!).render(<React.StrictMode><QueryClientProvider client={client}><Router><App/></Router></QueryClientProvider></React.StrictMode>);
