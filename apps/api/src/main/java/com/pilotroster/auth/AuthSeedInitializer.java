package com.pilotroster.auth;

import java.util.List;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AuthSeedInitializer implements ApplicationRunner {

    private static final String DEFAULT_PASSWORD = "Admin123!";

    private final SysUserRepository sysUserRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthSeedInitializer(SysUserRepository sysUserRepository, PasswordEncoder passwordEncoder) {
        this.sysUserRepository = sysUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<String> seedUsers = List.of(
            "dispatcher01",
            "manager01",
            "pilot01",
            "pilot_unbound",
            "admin",
            "controller01"
        );
        for (String username : seedUsers) {
            sysUserRepository.findByUsername(username)
                .filter(user -> user.getPasswordHash() == null || user.getPasswordHash().isBlank())
                .ifPresent(user -> user.setPasswordHash(passwordEncoder.encode(DEFAULT_PASSWORD)));
        }
    }
}
