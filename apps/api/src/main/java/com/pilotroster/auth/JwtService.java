package com.pilotroster.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long expirationMinutes;

    public JwtService(
        @Value("${app.security.jwt-secret}") String jwtSecret,
        @Value("${app.security.jwt-expiration-minutes}") long expirationMinutes
    ) {
        this.signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        this.expirationMinutes = expirationMinutes;
    }

    public String issueToken(AuthenticatedUser user) {
        Instant now = Instant.now();
        return Jwts.builder()
            .subject(user.getUsername())
            .claim("userId", user.id())
            .claim("displayName", user.displayName())
            .claim("role", user.role().name())
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plus(expirationMinutes, ChronoUnit.MINUTES)))
            .signWith(signingKey)
            .compact();
    }

    public String extractUsername(String token) {
        return claims(token).getSubject();
    }

    public boolean isValid(String token, UserDetails userDetails) {
        Claims claims = claims(token);
        return claims.getSubject().equals(userDetails.getUsername())
            && claims.getExpiration().after(Date.from(Instant.now()));
    }

    private Claims claims(String token) {
        return Jwts.parser()
            .verifyWith(signingKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
}
