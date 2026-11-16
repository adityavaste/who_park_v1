module.exports = [
"[project]/app/layout.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// src/app/layout.tsx
__turbopack_context__.s([
    "default",
    ()=>RootLayout,
    "metadata",
    ()=>metadata
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
;
;
const SITE_URL = ("TURBOPACK compile-time value", "https://who-park-v1.vercel.app/") || 'https://whopark.in';
const metadata = {
    metadataBase: new URL(SITE_URL),
    verification: {
        google: 'google78e904329b6253ca.html'
    },
    title: {
        default: 'Who Park — Smart Car QR Sticker | Contact Parked Car Owner Privately',
        template: '%s | Who Park India'
    },
    description: 'Stuck behind a wrongly parked car or want to protect your mobile privacy? Who Park (whopark.in) QR windshield stickers let anyone alert a parked car owner instantly without sharing phone numbers.',
    keywords: [
        'Who Park',
        'whopark.in',
        'Who Park QR sticker',
        'car parking QR sticker India',
        'wrong parking alert app India',
        'contact car owner without phone number',
        'vehicle QR code sticker windshield',
        'car blocking driveway solution India',
        'housing society parking management QR',
        'private vehicle contact tag'
    ],
    authors: [
        {
            name: 'Who Park'
        }
    ],
    creator: 'Who Park',
    publisher: 'Who Park',
    alternates: {
        canonical: 'https://whopark.in'
    },
    openGraph: {
        type: 'website',
        locale: 'en_IN',
        url: 'https://whopark.in',
        siteName: 'Who Park',
        title: 'Who Park — Scan Windshield QR to Alert Parked Car Owners Privately',
        description: 'Never leave your mobile number on your car dashboard again. Get instant live ringtone & background push alerts when your car is blocking someone or headlights are on.',
        images: [
            {
                url: '/api/pwa-icon/512',
                width: 512,
                height: 512,
                alt: 'Who Park Smart Vehicle QR Alert Sticker'
            }
        ]
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Who Park — Smart Car Parking QR Sticker',
        description: 'Alert any parked car owner in 1 scan without revealing phone numbers. Built for Indian roads, apartments & office basements.',
        images: [
            '/api/pwa-icon/512'
        ]
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1
        }
    }
};
function RootLayout({ children }) {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebSite',
                name: 'Who Park',
                url: 'https://whopark.in'
            },
            {
                '@type': 'SoftwareApplication',
                name: 'Who Park',
                url: 'https://whopark.in',
                operatingSystem: 'Web, Android, iOS',
                applicationCategory: 'UtilitiesApplication',
                offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'INR'
                },
                description: 'Who Park (whopark.in) is a QR-based vehicle parking alert platform allowing anyone to notify a parked car owner privately without exposing phone numbers.'
            },
            {
                '@type': 'FAQPage',
                mainEntity: [
                    {
                        '@type': 'Question',
                        name: 'How can someone contact a parked car owner without their phone number?',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: 'By scanning the Who Park QR sticker placed on the car windshield with any phone camera. It sends an instant ringtone and push alert to the owner without revealing either person’s mobile number.'
                        }
                    },
                    {
                        '@type': 'Question',
                        name: 'Do people scanning a Who Park QR sticker need to download an app?',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: 'No. Any standard smartphone camera or Google Lens opens whopark.in directly in the browser within seconds.'
                        }
                    },
                    {
                        '@type': 'Question',
                        name: 'How does Who Park prevent fake or spam alerts?',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: 'Who Park enforces a strict 5-minute cooldown per vehicle and a maximum limit of 10 alerts per day per scanner.'
                        }
                    }
                ]
            }
        ]
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("html", {
        lang: "en-IN",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("head", {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("script", {
                    type: "application/ld+json",
                    dangerouslySetInnerHTML: {
                        __html: JSON.stringify(jsonLd)
                    }
                }, void 0, false, {
                    fileName: "[project]/app/layout.tsx",
                    lineNumber: 135,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/layout.tsx",
                lineNumber: 134,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("body", {
                className: "bg-[#FFFDF0] text-black antialiased",
                children: children
            }, void 0, false, {
                fileName: "[project]/app/layout.tsx",
                lineNumber: 140,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/layout.tsx",
        lineNumber: 133,
        columnNumber: 5
    }, this);
}
}),
"[project]/app/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", (function(__turbopack_context__){

__turbopack_context__.n(__turbopack_context__.i("[project]/app/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-rsc] (ecmascript)").vendored['react-rsc'].ReactJsxDevRuntime;
}),
];

//# sourceMappingURL=_109tcivt8knit._.js.map