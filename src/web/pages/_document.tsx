import { type DocumentProps, Head, Html, Main, NextScript } from 'next/document';

type Props = DocumentProps & {
  // add custom document props
};

export default function Document(_: Props) {
  return (
    <Html>
      <Head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="DSensei"></meta>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
