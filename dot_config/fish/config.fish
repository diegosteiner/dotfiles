alias vim="helix"

if status is-interactive
    # Commands to run in interactive sessions can go here
    fish_add_path ~/.local/bin
end

if not set -q SSH_AUTH_SOCK
    eval (ssh-agent -c) >/dev/null
end

set -gx EDITOR helix
