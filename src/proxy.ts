import { NextRequest, NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';

interface TokenPayload {
  role: string;
  exp: number;
  kycStatus?: string;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isMerchantRoute = pathname.startsWith('/merchant');
  const isAdminRoute = pathname.startsWith('/admin');

  if (!isMerchantRoute && !isAdminRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get('accessToken')?.value || request.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  try {
    const decoded = jwtDecode<TokenPayload>(token);

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      const response = NextResponse.redirect(new URL('/auth/login', request.url));
      response.cookies.delete('accessToken');
      response.cookies.delete('token');
      return response;
    }

    if (isAdminRoute) {
      return decoded.role === 'ADMIN'
        ? NextResponse.next()
        : NextResponse.redirect(new URL('/', request.url));
    }

    if (decoded.role !== 'MERCHANT') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    const kycStatus = request.cookies.get('kycStatus')?.value || decoded.kycStatus;
    if (kycStatus === 'PENDING' && pathname !== '/merchant/businessRegistration') {
      return NextResponse.redirect(new URL('/merchant/businessRegistration', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Token decode error:', error);
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    response.cookies.delete('accessToken');
    response.cookies.delete('token');
    return response;
  }
}

export const config = {
  matcher: ['/merchant/:path*', '/admin/:path*'],
};
