import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, req) {
                if (!credentials?.email || !credentials?.password) {
                    console.error("Login failed: Credentials not provided.");
                    return null;
                }

                try {
                    const res = await fetch('http://localhost:8000/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        body: JSON.stringify({ email: credentials.email, password: credentials.password })
                    });

                    if (!res.ok) {
                        const errorBody = await res.json();
                        console.error(`Login failed: Laravel API returned status ${res.status}.`, errorBody);
                        return null;
                    }

                    const response = await res.json();

                    if (response.user && response.token) {
                        console.log("Login successful, user data received from API.");
                        return {
                            id: response.user.id,
                            name: response.user.name,
                            email: response.user.email,
                            accessToken: response.token
                        };
                    } else {
                        console.error("Login failed: API response was successful but missing 'user' or 'token'.", response);
                        return null;
                    }
                } catch (error) {
                    console.error("Login failed: A network or fetch error occurred.", error);
                    return null;
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.accessToken = user.accessToken;
                token.id = user.id;
                token.name = user.name;
            }
            return token;
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken;
            if (session.user) {
                session.user.id = token.id as string;
                session.user.name = token.name;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt'
    },
    secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }