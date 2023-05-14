import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';

import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });
const darkTheme = createTheme({
  palette: {
    mode: 'dark'
  }
});

function App({ Component, pageProps }: AppProps<any>) {
  const queryClient = new QueryClient();

  return (
    <ThemeProvider theme={darkTheme}>
      <div className={inter.className}>
        <Toaster />
        <QueryClientProvider client={queryClient}>
          <Component {...pageProps} />
        </QueryClientProvider>
      </div>
    </ThemeProvider>
  );
}

export default App;
