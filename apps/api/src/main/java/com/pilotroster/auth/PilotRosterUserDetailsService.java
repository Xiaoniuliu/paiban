package com.pilotroster.auth;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class PilotRosterUserDetailsService implements UserDetailsService {

    private final SysUserRepository sysUserRepository;

    public PilotRosterUserDetailsService(SysUserRepository sysUserRepository) {
        this.sysUserRepository = sysUserRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return sysUserRepository.findByUsername(username)
            .map(AuthenticatedUser::new)
            .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
