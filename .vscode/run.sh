DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
palm-package simplechat-app simplechat-service simplechat-package
palm-install com.jonandnic.simplechat_2.0.0_all.ipk
palm-launch com.jonandnic.simplechat
palm-log -f com.jonandnic.simplechat.app