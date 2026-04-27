package com.pilotroster.auth;

import com.pilotroster.auth.AuthDtos.LoginRequest;
import com.pilotroster.auth.AuthDtos.LoginResponse;
import com.pilotroster.auth.AuthDtos.UserProfile;
import com.pilotroster.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthController(AuthenticationManager authenticationManager, JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthenticatedUser user = (AuthenticatedUser) authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.username(), request.password())
        ).getPrincipal();

        return ApiResponse.ok(new LoginResponse(jwtService.issueToken(user), UserProfile.from(user)));
    }

    @GetMapping("/me")
    public ApiResponse<UserProfile> me(@AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(UserProfile.from(user));
    }
}
