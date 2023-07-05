
import { Footer } from './components/footer';
import { Main } from './components/main';
import { Analytics } from '@vercel/analytics/react';

function HomePage() {
  return (
    <>
      <Main />
      <Footer />
      <Analytics />
    </>
  );
}

export default HomePage;
