#include <emscripten/emscripten.h>
#include <emscripten/bind.h>
#include <cmath>
#include <vector>
#include <random>

struct Flower {
    float x, y, z, vx, vy, rot, scale, time;
    int id, color;
    Flower(int i) : x(0), y(0), z(0), vx(0), vy(0), rot(0), scale(1), time(0), id(i), color(i % 6) {}
};

class FooterAnimationSystem {
    std::vector<Flower> flowers;
    std::mt19937 rng{std::random_device{}()};
    float width, height;
    
public:
    void setDimensions(float w, float h) { width = w; height = h; }
    
    void init() {
        flowers.clear();
        std::uniform_real_distribution<float> xDist(-width/200.0f, width/200.0f);
        std::uniform_real_distribution<float> yDist(-height/200.0f, height/200.0f);
        std::uniform_real_distribution<float> zDist(0.0f, 2.0f);
        std::uniform_real_distribution<float> scaleDist(0.3f, 0.7f);
        std::uniform_real_distribution<float> velDist(-0.003f, 0.003f);
        
        for (int i = 0; i < 6; i++) {
            Flower flower(i);
            flower.x = xDist(rng);
            flower.y = yDist(rng);
            flower.z = zDist(rng);
            flower.scale = scaleDist(rng);
            flower.vx = velDist(rng);
            flower.vy = velDist(rng) * 0.5f;
            flower.rot = rng() % 360;
            flowers.push_back(flower);
        }
    }
    
    void update(float dt) {
        for (auto& flower : flowers) {
            flower.time += dt;
            
            flower.x += flower.vx + std::cos(flower.time * 0.5f + flower.id) * 0.003f;
            flower.y += flower.vy + std::sin(flower.time * 2.0f + flower.id) * 0.005f;
            flower.rot += 10.0f * dt;
            
            float boundary = width / 200.0f + 1.0f;
            if (flower.x > boundary) flower.x = -boundary;
            if (flower.x < -boundary) flower.x = boundary;
            
            float yBoundary = height / 200.0f;
            if (flower.y > yBoundary) flower.y = -yBoundary;
            if (flower.y < -yBoundary) flower.y = yBoundary;
        }
    }
    
    emscripten::val getData() {
        auto result = emscripten::val::array();
        for (const auto& flower : flowers) {
            auto data = emscripten::val::object();
            data.set("id", flower.id);
            data.set("x", flower.x);
            data.set("y", flower.y);
            data.set("z", flower.z);
            data.set("rotation", flower.rot);
            data.set("scale", flower.scale);
            data.set("color", flower.color);
            result.call<void>("push", data);
        }
        return result;
    }
    
    void resize(float w, float h) {
        float sx = w / width, sy = h / height;
        setDimensions(w, h);
        for (auto& flower : flowers) {
            flower.x *= sx;
            flower.y *= sy;
        }
    }
    
    void clear() { flowers.clear(); }
};

static FooterAnimationSystem sys;

extern "C" {
    EMSCRIPTEN_KEEPALIVE void footerInit(float w, float h) { sys.setDimensions(w, h); sys.init(); }
    EMSCRIPTEN_KEEPALIVE void footerUpdate(float dt) { sys.update(dt); }
    EMSCRIPTEN_KEEPALIVE void footerResize(float w, float h) { sys.resize(w, h); }
    EMSCRIPTEN_KEEPALIVE void footerClear() { sys.clear(); }
}

EMSCRIPTEN_BINDINGS(footer_animations) {
    emscripten::class_<FooterAnimationSystem>("FooterAnimationSystem")
        .function("setDimensions", &FooterAnimationSystem::setDimensions)
        .function("init", &FooterAnimationSystem::init)
        .function("update", &FooterAnimationSystem::update)
        .function("getData", &FooterAnimationSystem::getData)
        .function("resize", &FooterAnimationSystem::resize)
        .function("clear", &FooterAnimationSystem::clear);
}