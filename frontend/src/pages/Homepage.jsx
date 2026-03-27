const HomePage = () => {
    return (
        <div style={styles.container}>
            {/* Hero Section */}
            <section style={styles.hero}>
                {/* Background Image */}
                <img 
                    src="/images/biguri-hero.jpg" 
                    alt="Biguri Premium Seafood" 
                    style={styles.backgroundImage}
                    onError={(e) => {
                        console.warn('Hero image failed to load');
                        e.target.style.backgroundColor = '#001a2e';
                    }}
                />
            </section>
        </div>
    );
};

const styles = {
    container: {
        margin: 0,
        padding: 0,
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#001a2e',
    },
    hero: {
        position: 'relative',
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    backgroundImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center center',
        zIndex: 1,
    },
};

export default HomePage;